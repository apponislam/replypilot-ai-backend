import { Schema, model } from "mongoose";
import { ISetting } from "./setting.interface";

const SettingSchema = new Schema<ISetting>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        isAutoReply: {
            type: Boolean,
            default: false,
        },
        instructions: {
            type: String,
            default: "Be polite, professional, and clear. Sign off warmly as the ReplyPilot Team.",
        },
        tone: {
            type: String,
            enum: ["professional", "friendly", "concise", "formal", "casual"],
            default: "professional",
        },
        senderName: {
            type: String,
            default: "ReplyPilot",
        },
        senderEmail: {
            type: String,
            default: "replypilotai@apponislam.top",
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const SettingModel = model<ISetting>("Setting", SettingSchema);
