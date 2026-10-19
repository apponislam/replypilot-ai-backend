import { Webhook } from "svix";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import config from "../../config";
import { getReceivedEmail, sendMail } from "../../../utils/resend";
import { generateEmailReply, summarizeEmail } from "../../../utils/ollama";
import { settingServices } from "../setting/setting.services";
import { EmailModel } from "./email.model";
import { IEmail, IResendWebhookEvent, EmailStatus } from "./email.interface";
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
 * Handle incoming email.received event from Resend:
 * 1. Saves INBOUND email record.
 * 2. Generates summary & AI draft reply using Ollama and saved Setting instructions.
 * 3. If Setting.isAutoReply is TRUE -> sends reply via Resend and creates OUTBOUND record referencing this email.
 *    If Setting.isAutoReply is FALSE -> saves aiDraft for Admin to review and click "Send" from Dashboard.
 */
const handleInboundEmailReceived = async (event: IResendWebhookEvent) => {
    const emailId = event.data?.email_id || event.data?.id;

    if (!emailId) {
        console.warn("⚠️ [Resend Webhook] email.received event missing email_id:", event);
        throw new ApiError(httpStatus.BAD_REQUEST, "email_id is missing from webhook data");
    }

    // Check if already processed (idempotency)
    const existing = await EmailModel.findOne({ emailId, type: "INBOUND" });
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
    const attachments = (fullEmailData?.attachments || event.data?.attachments || []).map((att: any) => ({
        id: att.id,
        filename: att.filename,
        contentType: att.content_type || att.contentType,
        size: att.size,
        contentDisposition: att.content_disposition || att.contentDisposition,
        contentId: att.content_id || att.contentId,
        downloadUrl: att.download_url || att.downloadUrl,
    }));

    // 1. Create Inbound Email Record
    const inboundEmail = await EmailModel.create({
        type: "INBOUND",
        emailId,
        messageId: fullEmailData?.message_id || event.data?.message_id,
        from: fromAddress,
        to: Array.isArray(toRecipients) ? toRecipients : [toRecipients],
        cc: fullEmailData?.cc || event.data?.cc || [],
        bcc: fullEmailData?.bcc || event.data?.bcc || [],
        subject,
        text: textBody,
        html: htmlBody,
        attachments,
        status: "UNREAD",
    });

    console.log(`✅ [Resend Webhook] Saved incoming email: "${subject}" from "${fromAddress}"`);

    // Notify connected admins
    sendToRoom("admins", "new_inbound_email", inboundEmail);

    // 2. Background AI Processing & Auto-Reply
    (async () => {
        try {
            const settings = await settingServices.getSettings();
            const content = textBody || htmlBody || subject;

            console.log(`🤖 [Ollama] Generating draft for incoming email: "${subject}"...`);
            const [aiResult, summary] = await Promise.all([
                generateEmailReply({
                    from: fromAddress,
                    subject,
                    content,
                    tone: settings.tone,
                    instructions: settings.instructions,
                }).catch((err) => {
                    console.warn("⚠️ [Ollama] Reply generation failed:", err.message);
                    return null;
                }),
                summarizeEmail(subject, content).catch(() => ""),
            ]);

            const aiDraft = aiResult?.reply || "";

            // 3. If Auto-Reply is enabled, immediately dispatch outbound reply with AUTO_REPLIED status
            if (settings.isAutoReply && aiDraft) {
                console.log(`🚀 [Auto-Reply] Auto-reply is ON. Sending auto-reply to ${fromAddress}...`);

                // Save draft & summary first
                await EmailModel.findByIdAndUpdate(
                    inboundEmail._id,
                    {
                        ...(summary && { summary }),
                        ...(aiDraft && { aiDraft }),
                    }
                );

                // Send outbound auto-reply (sets inbound status to "AUTO_REPLIED")
                const replyResult = await sendOutboundReply(
                    inboundEmail._id.toString(),
                    aiDraft,
                    null,
                    true // isAuto = true -> AUTO_REPLIED
                );

                console.log(`✅ [Auto-Reply] Email auto-replied successfully. Status set to AUTO_REPLIED.`);
                sendToRoom("admins", "email_auto_replied", replyResult.inboundEmail);
                sendToRoom("admins", "email_updated", replyResult.inboundEmail);
            } else {
                console.log(`ℹ️ [Auto-Reply] Auto-reply is OFF. Draft saved for admin review.`);
                // Update inbound email with summary & draft, keeping status as UNREAD
                const updatedInbound = await EmailModel.findByIdAndUpdate(
                    inboundEmail._id,
                    {
                        ...(summary && { summary }),
                        ...(aiDraft && { aiDraft }),
                    },
                    { returnDocument: "after" }
                );

                sendToRoom("admins", "email_draft_ready", updatedInbound);
                sendToRoom("admins", "email_updated", updatedInbound);
            }
        } catch (err: any) {
            console.error("⚠️ [Email Background Processing Error]:", err.message);
        }
    })();

    return inboundEmail;
};

/**
 * Generate or re-generate an AI draft reply for an email on demand (Admin button).
 */
const generateDraftReply = async (
    id: string,
    options: {
        tone?: "professional" | "friendly" | "concise" | "formal" | "casual";
        instructions?: string;
        customPrompt?: string;
    }
): Promise<IEmail> => {
    const email = await EmailModel.findById(id);
    if (!email) {
        throw new ApiError(httpStatus.NOT_FOUND, "Email not found");
    }

    const settings = await settingServices.getSettings();
    const content = email.text || email.html || email.subject;
    const tone = options.tone || settings.tone || "professional";
    const instructions = options.instructions || settings.instructions;

    const aiResult = await generateEmailReply({
        from: email.from,
        subject: email.subject,
        content,
        tone,
        instructions,
        customPrompt: options.customPrompt,
    });

    const updated = await EmailModel.findByIdAndUpdate(
        email._id,
        {
            aiDraft: aiResult.reply,
        },
        { returnDocument: "after" }
    );

    if (!updated) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update draft");
    }

    return updated;
};

/**
 * Send an outbound reply to an inbound email (Admin Send Button or Auto-Pilot):
 * 1. Sends email via Resend.
 * 2. Creates a new OUTBOUND Email record with replyTo: inboundEmail._id (as reference!).
 * 3. Updates inbound email status to "AUTO_REPLIED" (if auto-pilot) or "REPLIED" (if admin).
 */
const sendOutboundReply = async (
    inboundEmailId: string,
    replyText?: string,
    adminUserId?: string | null,
    isAuto: boolean = false
): Promise<{ inboundEmail: IEmail; outboundEmail: IEmail }> => {
    const inboundEmail = await EmailModel.findById(inboundEmailId);
    if (!inboundEmail) {
        throw new ApiError(httpStatus.NOT_FOUND, "Incoming email not found");
    }

    const textToSend = replyText || inboundEmail.aiDraft;
    if (!textToSend) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No reply content to send. Generate or enter a reply first.");
    }

    const replySubject = inboundEmail.subject.startsWith("Re:")
        ? inboundEmail.subject
        : `Re: ${inboundEmail.subject}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
            <p>${textToSend.replace(/\n/g, "<br/>")}</p>
            <br/>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #888;">
                In reply to your message: <em>"${inboundEmail.subject}"</em>
            </p>
        </div>
    `;

    // Send email via Resend
    const resendResult = await sendMail(inboundEmail.from, replySubject, htmlContent);
    if (!resendResult) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send email via Resend");
    }

    // Determine target status: AUTO_REPLIED if auto-pilot / no admin, else REPLIED
    const targetStatus: EmailStatus = isAuto || !adminUserId ? "AUTO_REPLIED" : "REPLIED";

    // Create Outbound Email Record referencing the inbound email
    const outboundEmail = await EmailModel.create({
        type: "OUTBOUND",
        replyTo: inboundEmail._id,
        emailId: resendResult?.id,
        from: config.resend.from_email || "replypilotai@apponislam.top",
        to: [inboundEmail.from],
        subject: replySubject,
        text: textToSend,
        html: htmlContent,
        status: "SENT",
        sentBy: adminUserId ? (adminUserId as any) : null,
    });

    // Mark original email with the target status
    const updatedInbound = await EmailModel.findByIdAndUpdate(
        inboundEmail._id,
        { status: targetStatus },
        { returnDocument: "after" }
    );

    // Notify connected clients with detailed status and the updated email
    sendToRoom("admins", "email_replied", {
        inboundEmailId: inboundEmail._id,
        outboundReplyId: outboundEmail._id,
        inboundEmail: updatedInbound,
        status: targetStatus,
        isAutoReply: isAuto || !adminUserId,
    });

    sendToRoom("admins", "email_updated", updatedInbound);
    sendToRoom("admins", "email_status_updated", {
        id: inboundEmail._id,
        status: targetStatus,
        email: updatedInbound,
    });

    return {
        inboundEmail: updatedInbound!,
        outboundEmail,
    };
};

/**
 * Get all incoming emails with pagination, search, status filter (Admin).
 */
const getAllInboundEmails = async (query: Record<string, any>) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
        type: "INBOUND",
    };

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
            .limit(limit),
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
 * Get single email with thread of replies (where replyTo = email._id).
 */
const getEmailWithReplies = async (id: string) => {
    let email = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        email = await EmailModel.findById(id).populate("replyTo");
    }
    if (!email) {
        email = await EmailModel.findOne({ emailId: id }).populate("replyTo");
    }

    if (!email) {
        return null;
    }

    // Automatically mark as READ if currently UNREAD
    if (email.status === "UNREAD") {
        email.status = "READ";
        await email.save();

        // Broadcast real-time status update so lists and badges update immediately
        sendToRoom("admins", "email_status_updated", {
            id: email._id,
            status: "READ",
            email,
        });
        sendToRoom("admins", "email_updated", email);
    }

    // Find all replies that reference this email
    const replies = await EmailModel.find({ replyTo: email._id })
        .populate("sentBy", "name email role")
        .sort({ createdAt: 1 });

    return {
        email,
        replies,
    };
};

/**
 * Update email status (e.g. READ, ARCHIVED).
 */
const updateEmailStatus = async (id: string, status: EmailStatus): Promise<IEmail | null> => {
    return await EmailModel.findByIdAndUpdate(
        id,
        { status },
        { returnDocument: "after", runValidators: true }
    );
};

/**
 * Delete email and any related replies.
 */
const deleteEmail = async (id: string): Promise<IEmail | null> => {
    await EmailModel.deleteMany({ replyTo: id });
    return await EmailModel.findByIdAndDelete(id);
};

export const emailServices = {
    verifyWebhookSignature,
    processWebhookEvent,
    handleInboundEmailReceived,
    generateDraftReply,
    sendOutboundReply,
    getAllInboundEmails,
    getEmailWithReplies,
    updateEmailStatus,
    deleteEmail,
};
