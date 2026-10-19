import { Document, Types } from "mongoose";

export interface ISetting extends Document {
    user: Types.ObjectId;
    isAutoReply: boolean;
    instructions: string;
    tone: "professional" | "friendly" | "concise" | "formal" | "casual";
    senderName: string;
    senderEmail: string;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
