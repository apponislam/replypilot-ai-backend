import { Document } from "mongoose";

export type InboundEmailStatus = "RECEIVED" | "PROCESSING" | "REPLIED" | "ARCHIVED" | "FAILED";

export interface IEmailAttachment {
    id?: string;
    filename?: string;
    contentType?: string;
    size?: number;
    contentDisposition?: string;
    contentId?: string;
    downloadUrl?: string;
}

export interface IEmailAiReply {
    suggestedReply?: string;
    model?: string;
    tone?: string;
    generatedAt?: Date;
    sentAt?: Date;
    sentReply?: string;
    status?: "DRAFT" | "SENT" | "DISCARDED";
}

export interface IEmail extends Document {
    emailId: string;
    messageId?: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    replyTo?: string[];
    subject: string;
    text?: string;
    html?: string;
    summary?: string;
    headers?: Record<string, any>;
    attachments?: IEmailAttachment[];
    aiReply?: IEmailAiReply;
    status: InboundEmailStatus;
    eventType: string;
    rawEvent?: Record<string, any>;
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
