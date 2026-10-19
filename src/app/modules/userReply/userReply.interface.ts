import { Document, Types } from "mongoose";

export type UserReplyStatus = "DRAFT" | "SENT";

export interface IUserReply extends Document {
    user: Types.ObjectId; // User who generated this reply
    recipientEmail: string; // The email of the person being replied to
    subject: string;
    incomingMessage: string; // The content of the email they received
    generatedReply: string; // The AI-generated reply
    tone: "professional" | "friendly" | "concise" | "formal" | "casual";
    customInstructions?: string;
    senderName?: string;
    senderEmail?: string;
    status: UserReplyStatus;
    sentAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
