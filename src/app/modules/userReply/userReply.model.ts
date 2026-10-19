import { Schema, model } from "mongoose";
import { IUserReply } from "./userReply.interface";

const UserReplySchema = new Schema<IUserReply>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        recipientEmail: {
            type: String,
            required: true,
            index: true,
        },
        subject: {
            type: String,
            required: true,
            default: "Reply",
        },
        incomingMessage: {
            type: String,
            required: true,
        },
        generatedReply: {
            type: String,
            default: "",
        },
        tone: {
            type: String,
            enum: ["professional", "friendly", "concise", "formal", "casual"],
            default: "professional",
        },
        customInstructions: {
            type: String,
            default: "",
        },
        senderName: {
            type: String,
        },
        senderEmail: {
            type: String,
        },
        status: {
            type: String,
            enum: ["DRAFT", "SENT"],
            default: "DRAFT",
            index: true,
        },
        sentAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const UserReplyModel = model<IUserReply>("UserReply", UserReplySchema);
