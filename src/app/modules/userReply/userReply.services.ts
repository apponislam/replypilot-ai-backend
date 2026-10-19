import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import config from "../../config";
import { generateEmailReply } from "../../../utils/ollama";
import { sendMail } from "../../../utils/resend";
import { UserReplyModel } from "./userReply.model";
import { IUserReply } from "./userReply.interface";
import { settingServices } from "../setting/setting.services";
import { UserModel } from "../auth/auth.model";

/**
 * Generate a reply for a user and save the draft.
 */
const generateReply = async (
    userId: string,
    payload: {
        recipientEmail: string;
        subject: string;
        incomingMessage: string;
        tone?: "professional" | "friendly" | "concise" | "formal" | "casual";
        customInstructions?: string;
    }
): Promise<IUserReply> => {
    if (!payload.recipientEmail || !payload.incomingMessage) {
        throw new ApiError(httpStatus.BAD_REQUEST, "recipientEmail and incomingMessage are required");
    }

    const user = await UserModel.findById(userId);
    const userSettings = await settingServices.getSettings(userId);
    const tone = payload.tone || userSettings?.tone || "professional";

    // Resolve user's preferred sender name
    const senderName = (userSettings?.senderName && userSettings.senderName !== "ReplyPilot")
        ? userSettings.senderName
        : (user?.name || userSettings?.senderName || "ReplyPilot");

    const senderEmail = (userSettings?.senderEmail && userSettings.senderEmail !== "replypilotai@apponislam.top")
        ? userSettings.senderEmail
        : (user?.email || "replypilotai@apponislam.top");

    let customInstructions = payload.customInstructions || userSettings?.instructions || "";
    if (!payload.customInstructions && senderName && senderName !== "ReplyPilot") {
        customInstructions = customInstructions.replace(/ReplyPilot Team/gi, senderName);
    }

    // Call local Ollama
    const aiResult = await generateEmailReply({
        from: payload.recipientEmail,
        subject: payload.subject || "Reply",
        content: payload.incomingMessage,
        tone,
        instructions: customInstructions,
    });

    const userReply = await UserReplyModel.create({
        user: userId,
        recipientEmail: payload.recipientEmail,
        subject: payload.subject || "Reply",
        incomingMessage: payload.incomingMessage,
        generatedReply: aiResult.reply,
        tone,
        customInstructions,
        senderName,
        senderEmail,
        status: "DRAFT",
    });

    return userReply;
};

/**
 * Send the generated reply from our system to the recipient.
 */
const sendReply = async (
    userId: string,
    replyId: string,
    editedReply?: string
): Promise<IUserReply> => {
    const record = await UserReplyModel.findOne({ _id: replyId, user: userId });
    if (!record) {
        throw new ApiError(httpStatus.NOT_FOUND, "Reply record not found");
    }

    const textToSend = editedReply || record.generatedReply;
    if (!textToSend) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No reply content to send");
    }

    // 1. Fetch user profile and user settings
    const user = await UserModel.findById(userId);
    const userSettings = await settingServices.getSettings(userId);

    // 2. Resolve preferred sender display name
    const senderName = (userSettings?.senderName && userSettings.senderName !== "ReplyPilot")
        ? userSettings.senderName
        : (user?.name || record.senderName || userSettings?.senderName || "ReplyPilot User");

    // 3. Resolve reply-to email (user's real email address so recipient reply lands in their inbox)
    const replyToEmail = (userSettings?.senderEmail && userSettings.senderEmail !== "replypilotai@apponislam.top")
        ? userSettings.senderEmail
        : (user?.email || record.senderEmail || undefined);

    // 4. Resolve system verified sending domain
    const defaultFrom = config.resend.from_email || "replypilotai@apponislam.top";
    const match = defaultFrom.match(/<([^>]+)>/);
    const baseEmail = match ? match[1].trim() : defaultFrom.trim();

    // From header with user's name: e.g. "John Doe via ReplyPilot <replypilotai@apponislam.top>"
    const fromAddress = senderName.toLowerCase().includes("replypilot")
        ? `${senderName} <${baseEmail}>`
        : `${senderName} via ReplyPilot <${baseEmail}>`;

    const subject = record.subject.startsWith("Re:") ? record.subject : `Re: ${record.subject}`;

    // 5. Build professional email template with sender name & email info
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px 16px;">
            <div style="font-size: 15px; color: #1f2937; white-space: pre-wrap; margin-bottom: 24px;">${textToSend}</div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">
                    ${senderName}
                </p>
                ${replyToEmail ? `<p style="margin: 3px 0 0; font-size: 13px; color: #6b7280;">Email: <a href="mailto:${replyToEmail}" style="color: #4f46e5; text-decoration: none;">${replyToEmail}</a></p>` : ""}
                <p style="margin: 12px 0 0; font-size: 12px; color: #9ca3af;">
                    Sent by <strong>${senderName}</strong> ${replyToEmail ? `(${replyToEmail})` : ""} via <strong>ReplyPilot AI</strong>
                </p>
            </div>
        </div>
    `;

    // 6. Send email with user's display name and user's real email in Reply-To
    const resendResult = await sendMail(
        record.recipientEmail,
        subject,
        htmlContent,
        fromAddress,
        replyToEmail
    );

    if (!resendResult) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send email via Resend");
    }

    const updated = await UserReplyModel.findByIdAndUpdate(
        record._id,
        {
            generatedReply: textToSend,
            senderName,
            senderEmail: replyToEmail || baseEmail,
            status: "SENT",
            sentAt: new Date(),
        },
        { returnDocument: "after" }
    );

    return updated!;
};

/**
 * Get all generated replies for a user.
 */
const getUserReplies = async (userId: string, query: Record<string, any>) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
        user: userId,
    };

    if (query.status) {
        filter.status = query.status;
    }

    if (query.search) {
        const searchRegex = new RegExp(String(query.search), "i");
        filter.$or = [
            { recipientEmail: searchRegex },
            { subject: searchRegex },
            { incomingMessage: searchRegex },
            { generatedReply: searchRegex },
        ];
    }

    const [replies, total] = await Promise.all([
        UserReplyModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        UserReplyModel.countDocuments(filter),
    ]);

    return {
        data: replies,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get single reply by ID.
 */
const getUserReplyById = async (userId: string, id: string): Promise<IUserReply | null> => {
    return await UserReplyModel.findOne({ _id: id, user: userId });
};

/**
 * Delete a reply.
 */
const deleteUserReply = async (userId: string, id: string): Promise<IUserReply | null> => {
    return await UserReplyModel.findOneAndDelete({ _id: id, user: userId });
};

export const userReplyServices = {
    generateReply,
    sendReply,
    getUserReplies,
    getUserReplyById,
    deleteUserReply,
};
