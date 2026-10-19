import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import config from "../../config";
import { generateEmailReply } from "../../../utils/ollama";
import { sendMail } from "../../../utils/resend";
import { UserReplyModel } from "./userReply.model";
import { IUserReply } from "./userReply.interface";
import { settingServices } from "../setting/setting.services";

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

    const userSettings = await settingServices.getSettings(userId);
    const tone = payload.tone || userSettings?.tone || "professional";
    const customInstructions = payload.customInstructions || userSettings?.instructions || "";

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

    const subject = record.subject.startsWith("Re:") ? record.subject : `Re: ${record.subject}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
            <p>${textToSend.replace(/\n/g, "<br/>")}</p>
            <br/>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #888;">
                Sent via <strong>ReplyPilot AI</strong>
            </p>
        </div>
    `;

    const resendResult = await sendMail(record.recipientEmail, subject, htmlContent);
    if (!resendResult) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send email via Resend");
    }

    const updated = await UserReplyModel.findByIdAndUpdate(
        record._id,
        {
            generatedReply: textToSend,
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
