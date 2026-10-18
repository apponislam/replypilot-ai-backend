import { Webhook } from "svix";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import config from "../../config";
import { getReceivedEmail, sendMail } from "../../../utils/resend";
import { generateEmailReply, summarizeEmail, listOllamaModels } from "../../../utils/ollama";
import { EmailModel } from "./email.model";
import { IEmail, IResendWebhookEvent, InboundEmailStatus } from "./email.interface";
import { sendToRoom } from "../../socket/socket";

/**
 * Verify Resend/Svix webhook signature.
 */
const verifyWebhookSignature = (
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
): IResendWebhookEvent => {
    const webhookSecret = config.resend.webhook_secret;

    if (!webhookSecret) {
        console.warn(
            "⚠️ [Resend Webhook] RESEND_WEBHOOK_SECRET is not configured. Skipping signature verification in development mode."
        );
        try {
            return typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
        } catch {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON payload");
        }
    }

    const svixId = (headers["svix-id"] || headers["webhook-id"]) as string;
    const svixTimestamp = (headers["svix-timestamp"] || headers["webhook-timestamp"]) as string;
    const svixSignature = (headers["svix-signature"] || headers["webhook-signature"]) as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Missing required Svix webhook verification headers (svix-id, svix-timestamp, svix-signature)"
        );
    }

    try {
        const wh = new Webhook(webhookSecret);
        wh.verify(rawBody, {
            "svix-id": svixId,
            "svix-timestamp": svixTimestamp,
            "svix-signature": svixSignature,
        });

        return JSON.parse(rawBody) as IResendWebhookEvent;
    } catch (err: any) {
        console.error("❌ [Resend Webhook] Signature verification failed:", err.message);
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid webhook signature: ${err.message}`);
    }
};

/**
 * Process inbound Resend webhook events.
 */
const processWebhookEvent = async (event: IResendWebhookEvent) => {
    const eventType = event?.type;
    console.log(`📩 [Resend Webhook] Received event type: "${eventType}"`);

    if (eventType === "email.received") {
        return await handleInboundEmailReceived(event);
    }

    console.log(`ℹ️ [Resend Webhook] Handled event "${eventType}" for:`, event.data?.email_id || event.data?.id);
    return {
        event: eventType,
        handled: true,
        data: event.data,
    };
};

/**
 * Handle incoming email.received event:
 * - Prevents duplicate processing (idempotent)
 * - Fetches full email body (HTML, Text, Attachments) from Resend Receiving API
 * - Stores received email in MongoDB
 * - Automatically triggers local Ollama AI to generate summary & suggested reply in the background
 * - Emits real-time notifications to admin room via Socket.io
 */
const handleInboundEmailReceived = async (event: IResendWebhookEvent) => {
    const emailId = event.data?.email_id || event.data?.id;

    if (!emailId) {
        console.warn("⚠️ [Resend Webhook] email.received event missing email_id:", event);
        throw new ApiError(httpStatus.BAD_REQUEST, "email_id is missing from webhook data");
    }

    // Check if already processed (idempotency)
    const existing = await EmailModel.findOne({ emailId });
    if (existing) {
        console.log(`🔁 [Resend Webhook] Email ${emailId} already processed. Skipping duplicate.`);
        return existing;
    }

    // Fetch full email content from Resend API
    console.log(`📥 [Resend Webhook] Fetching full email content for email_id: ${emailId}...`);
    const fullEmailData: any = await getReceivedEmail(emailId);

    const fromAddress = fullEmailData?.from || event.data?.from || "unknown@unknown.com";
    const toRecipients = fullEmailData?.to || event.data?.to || [];
    const subject = fullEmailData?.subject || event.data?.subject || "(No Subject)";
    const textBody = fullEmailData?.text || "";
    const htmlBody = fullEmailData?.html || "";
    const headers = fullEmailData?.headers || {};
    const attachments = (fullEmailData?.attachments || event.data?.attachments || []).map((att: any) => ({
        id: att.id,
        filename: att.filename,
        contentType: att.content_type || att.contentType,
        size: att.size,
        contentDisposition: att.content_disposition || att.contentDisposition,
        contentId: att.content_id || att.contentId,
        downloadUrl: att.download_url || att.downloadUrl,
    }));

    const inboundEmail = await EmailModel.create({
        emailId,
        messageId: fullEmailData?.message_id || event.data?.message_id,
        from: fromAddress,
        to: Array.isArray(toRecipients) ? toRecipients : [toRecipients],
        cc: fullEmailData?.cc || event.data?.cc || [],
        bcc: fullEmailData?.bcc || event.data?.bcc || [],
        replyTo: fullEmailData?.reply_to || [],
        subject,
        text: textBody,
        html: htmlBody,
        headers,
        attachments,
        status: "RECEIVED",
        eventType: "email.received",
        rawEvent: event,
    });

    console.log(`✅ [Resend Webhook] Successfully saved inbound email: "${subject}" from "${fromAddress}"`);

    // Notify connected admin sockets in real-time
    try {
        sendToRoom("admins", "new_inbound_email", {
            _id: inboundEmail._id,
            emailId: inboundEmail.emailId,
            from: inboundEmail.from,
            to: inboundEmail.to,
            subject: inboundEmail.subject,
            createdAt: inboundEmail.createdAt,
            hasAttachments: attachments.length > 0,
        });
    } catch (socketErr) {
        console.warn("⚠️ [Resend Webhook] Failed to emit socket event:", socketErr);
    }

    // Trigger local Ollama AI to generate summary & suggested reply in background
    (async () => {
        try {
            const content = textBody || htmlBody || subject;
            console.log(`🤖 [Ollama] Auto-generating AI reply for email: "${subject}"...`);

            const [aiResult, summary] = await Promise.all([
                generateEmailReply({
                    from: fromAddress,
                    subject,
                    content,
                    tone: "professional",
                }).catch((err) => {
                    console.warn("⚠️ [Ollama] Auto reply generation failed:", err.message);
                    return null;
                }),
                summarizeEmail(subject, content).catch(() => ""),
            ]);

            if (aiResult || summary) {
                const updated = await EmailModel.findByIdAndUpdate(
                    inboundEmail._id,
                    {
                        ...(summary && { summary }),
                        ...(aiResult && {
                            aiReply: {
                                suggestedReply: aiResult.reply,
                                model: aiResult.model,
                                tone: "professional",
                                generatedAt: new Date(),
                                status: "DRAFT",
                            },
                        }),
                    },
                    { returnDocument: "after" }
                );

                console.log(`✨ [Ollama] AI suggested reply ready for email: "${subject}"`);
                sendToRoom("admins", "email_ai_ready", {
                    _id: inboundEmail._id,
                    emailId: inboundEmail.emailId,
                    summary: updated?.summary,
                    aiReply: updated?.aiReply,
                });
            }
        } catch (err: any) {
            console.error("⚠️ [Ollama] Background AI processing failed:", err.message);
        }
    })();

    return inboundEmail;
};

/**
 * Generate or re-generate an AI reply on demand with custom tone and instructions using Ollama.
 */
const generateAiReply = async (
    id: string,
    options: {
        tone?: "professional" | "friendly" | "concise" | "formal" | "casual";
        instructions?: string;
        customPrompt?: string;
    }
): Promise<IEmail> => {
    const email = await getEmailById(id);
    if (!email) {
        throw new ApiError(httpStatus.NOT_FOUND, "Email not found");
    }

    const content = email.text || email.html || email.subject;
    const tone = options.tone || (email.aiReply?.tone as any) || "professional";

    const aiResult = await generateEmailReply({
        from: email.from,
        subject: email.subject,
        content,
        tone,
        instructions: options.instructions,
        customPrompt: options.customPrompt,
    });

    const updated = await EmailModel.findByIdAndUpdate(
        email._id,
        {
            aiReply: {
                suggestedReply: aiResult.reply,
                model: aiResult.model,
                tone,
                generatedAt: new Date(),
                status: "DRAFT",
            },
        },
        { returnDocument: "after" }
    );

    if (!updated) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update email with AI reply");
    }

    return updated;
};

/**
 * Send reply to the sender using Resend.
 */
const sendReply = async (id: string, replyText?: string): Promise<IEmail> => {
    const email = await getEmailById(id);
    if (!email) {
        throw new ApiError(httpStatus.NOT_FOUND, "Email not found");
    }

    const textToSend = replyText || email.aiReply?.suggestedReply;
    if (!textToSend) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No reply content provided or generated");
    }

    // Format HTML reply
    const htmlReply = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p>${textToSend.replace(/\n/g, "<br/>")}</p>
            <br/>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #888;">
                In reply to your message: <em>"${email.subject}"</em>
            </p>
        </div>
    `;

    const subject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;

    const resendResult = await sendMail(email.from, subject, htmlReply);
    if (!resendResult) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send email via Resend");
    }

    const updated = await EmailModel.findByIdAndUpdate(
        email._id,
        {
            status: "REPLIED",
            aiReply: {
                ...((email.aiReply as any)?.toObject ? (email.aiReply as any).toObject() : email.aiReply),
                sentReply: textToSend,
                sentAt: new Date(),
                status: "SENT",
            },

        },
        { returnDocument: "after" }
    );

    if (!updated) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update email status after sending");
    }

    return updated;
};

/**
 * Get all emails with filtering and pagination.
 */
const getAllEmails = async (query: Record<string, any>) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.search) {
        const searchRegex = new RegExp(String(query.search), "i");
        filter.$or = [
            { from: searchRegex },
            { subject: searchRegex },
            { text: searchRegex },
            { summary: searchRegex },
        ];
    }

    const [emails, total] = await Promise.all([
        EmailModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("-rawEvent"),
        EmailModel.countDocuments(filter),
    ]);

    return {
        data: emails,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get single email by MongoDB ID or Resend emailId.
 */
const getEmailById = async (id: string): Promise<IEmail | null> => {
    let email = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        email = await EmailModel.findById(id);
    }
    if (!email) {
        email = await EmailModel.findOne({ emailId: id });
    }
    return email;
};

/**
 * Update email status (e.g. PROCESSING, REPLIED, ARCHIVED).
 */
const updateEmailStatus = async (id: string, status: InboundEmailStatus): Promise<IEmail | null> => {
    return await EmailModel.findByIdAndUpdate(
        id,
        { status },
        { returnDocument: "after", runValidators: true }
    );
};

/**
 * Delete email.
 */
const deleteEmail = async (id: string): Promise<IEmail | null> => {
    return await EmailModel.findByIdAndDelete(id);
};

/**
 * List available Ollama models.
 */
const getOllamaModels = async () => {
    return await listOllamaModels();
};

export const emailServices = {
    verifyWebhookSignature,
    processWebhookEvent,
    handleInboundEmailReceived,
    generateAiReply,
    sendReply,
    getOllamaModels,
    getAllEmails,
    getEmailById,
    updateEmailStatus,
    deleteEmail,
};
