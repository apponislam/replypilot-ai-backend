import { Schema, model } from "mongoose";
import { IEmail } from "./email.interface";

const AttachmentSchema = new Schema(
    {
        id: { type: String },
        filename: { type: String },
        contentType: { type: String },
        size: { type: Number },
        contentDisposition: { type: String },
        contentId: { type: String },
        downloadUrl: { type: String },
    },
    { _id: false }
);

const EmailSchema = new Schema<IEmail>(
    {
        emailId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        messageId: {
            type: String,
        },
        from: {
            type: String,
            required: true,
            index: true,
        },
        to: {
            type: [String],
            required: true,
            default: [],
        },
        cc: {
            type: [String],
            default: [],
        },
        bcc: {
            type: [String],
            default: [],
        },
        replyTo: {
            type: [String],
            default: [],
        },
        subject: {
            type: String,
            default: "(No Subject)",
            index: true,
        },
        text: {
            type: String,
            default: "",
        },
        html: {
            type: String,
            default: "",
        },
        summary: {
            type: String,
            default: "",
        },
        aiReply: {
            suggestedReply: { type: String },
            model: { type: String },
            tone: { type: String, default: "professional" },
            generatedAt: { type: Date },
            sentAt: { type: Date },
            sentReply: { type: String },
            status: {
                type: String,
                enum: ["DRAFT", "SENT", "DISCARDED"],
                default: "DRAFT",
            },
        },
        headers: {
            type: Schema.Types.Mixed,
            default: {},
        },

        attachments: {
            type: [AttachmentSchema],
            default: [],
        },
        status: {
            type: String,
            enum: ["RECEIVED", "PROCESSING", "REPLIED", "ARCHIVED", "FAILED"],
            default: "RECEIVED",
            index: true,
        },
        eventType: {
            type: String,
            default: "email.received",
        },
        rawEvent: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

export const EmailModel = model<IEmail>("Email", EmailSchema);
