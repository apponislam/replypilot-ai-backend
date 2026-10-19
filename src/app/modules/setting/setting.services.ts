import { SettingModel } from "./setting.model";
import { ISetting } from "./setting.interface";
import { UserModel } from "../auth/auth.model";

/**
 * Get settings for a specific user.
 * If userId is not provided, defaults to the ADMIN user's setting.
 */
const getSettings = async (userId?: string): Promise<ISetting> => {
    let targetUserId = userId;

    if (!targetUserId) {
        const admin = await UserModel.findOne({ role: "ADMIN" });
        targetUserId = admin?._id ? admin._id.toString() : undefined;
    }

    if (targetUserId) {
        let settings = await SettingModel.findOne({ user: targetUserId });
        if (!settings) {
            const user = await UserModel.findById(targetUserId);
            settings = await SettingModel.create({
                user: targetUserId,
                senderName: user?.name || "ReplyPilot",
                senderEmail: user?.email || "replypilotai@apponislam.top",
                instructions: user?.name
                    ? `Be polite, professional, and clear. Sign off warmly as ${user.name}.`
                    : "Be polite, professional, and clear. Sign off warmly as the ReplyPilot Team.",
                updatedBy: targetUserId as any,
            });
        }
        return settings;
    }

    // Fallback if no user exists in DB yet
    let fallback = await SettingModel.findOne();
    if (!fallback) {
        fallback = await SettingModel.create({});
    }
    return fallback;
};

/**
 * Update settings for a specific user.
 */
const updateSettings = async (payload: Partial<ISetting>, userId: string): Promise<ISetting> => {
    if (!userId) {
        throw new Error("User ID is required to update settings");
    }

    let settings = await SettingModel.findOne({ user: userId });
    if (!settings) {
        settings = await SettingModel.create({
            ...payload,
            user: userId,
            updatedBy: userId as any,
        });
        return settings;
    }

    const updated = await SettingModel.findByIdAndUpdate(
        settings._id,
        {
            ...payload,
            updatedBy: userId as any,
        },
        { returnDocument: "after", runValidators: true }
    );

    return updated!;
};

export const settingServices = {
    getSettings,
    updateSettings,
};
