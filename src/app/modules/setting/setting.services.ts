import { SettingModel } from "./setting.model";
import { ISetting } from "./setting.interface";

/**
 * Get system settings, ensuring a default singleton exists.
 */
const getSettings = async (): Promise<ISetting> => {
    let settings = await SettingModel.findOne();
    if (!settings) {
        settings = await SettingModel.create({});
    }
    return settings;
};

/**
 * Update system settings (auto-reply toggle, custom instructions, tone).
 */
const updateSettings = async (payload: Partial<ISetting>, userId?: string): Promise<ISetting> => {
    let settings = await SettingModel.findOne();
    if (!settings) {
        settings = await SettingModel.create({ ...payload, ...(userId && { updatedBy: userId as any }) });
        return settings;
    }

    const updated = await SettingModel.findByIdAndUpdate(
        settings._id,
        {
            ...payload,
            ...(userId && { updatedBy: userId as any }),
        },
        { returnDocument: "after", runValidators: true }
    );

    return updated!;
};

export const settingServices = {
    getSettings,
    updateSettings,
};
