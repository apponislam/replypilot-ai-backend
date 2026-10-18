import { Document, Types } from "mongoose";

export type EmailType = "INBOUND" | "OUTBOUND";
export type EmailStatus = "UNREAD" | "READ" | "REPLIED" | "SENT" | "ARCHIVED";

export interface IEmailAttachment {
    id?: string;
    filename?: string;
    contentType?: string;
    size?: number;
    contentDisposition?: string;
    contentId?: string;
    downloadUrl?: string;
}

export interface IEmail extends Document {
    type: EmailType; // "INBOUND" from external sender, or "OUTBOUND" reply
    replyTo?: Types.ObjectId | IEmail | null; // Ref to original email if this is a reply
    emailId?: string; // Resend ID
    messageId?: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    replyToEmail?: string;
    subject: string;
    text?: string;
    html?: string;
    summary?: string;
    aiDraft?: string; // Generated draft reply waiting for review
    status: EmailStatus;
    sentBy?: Types.ObjectId | null; // Admin/user who sent the reply (or null if auto-pilot)
    attachments?: IEmailAttachment[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IResendWebhookEvent {
    type: string;
    created_at: string;
    data: {
        email_id?: string;
        id?: string;
        from?: string;
        to?: string[];
        cc?: string[];
        bcc?: string[];
        subject?: string;
        message_id?: string;
        attachments?: any[];
        [key: string]: any;
    };
}
