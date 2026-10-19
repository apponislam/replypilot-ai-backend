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
    { _id: false, versionKey: false }
);

const EmailSchema = new Schema<IEmail>(
    {
        type: {
            type: String,
            enum: ["INBOUND", "OUTBOUND"],
            required: true,
            default: "INBOUND",
            index: true,
        },
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: "Email",
            default: null,
            index: true,
        },
        emailId: {
            type: String,
            sparse: true,
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
        aiDraft: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["UNREAD", "READ", "REPLIED", "AUTO_REPLIED", "SENT", "ARCHIVED"],
            default: "UNREAD",
            index: true,
        },
        sentBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        attachments: {
            type: [AttachmentSchema],
            default: [],
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const EmailModel = model<IEmail>("Email", EmailSchema);
