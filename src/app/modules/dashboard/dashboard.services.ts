import { EmailModel } from "../email/email.model";
import { UserModel } from "../auth/auth.model";
import { settingServices } from "../setting/setting.services";

/**
 * Get basic dashboard statistics.
 */
const getDashboardStats = async (userId?: string) => {
    const [
        totalEmails,
        unreadEmails,
        readEmails,
        autoRepliedEmails,
        repliedEmails,
        totalUsers,
        settings,
    ] = await Promise.all([
        EmailModel.countDocuments({ type: "INBOUND" }),
        EmailModel.countDocuments({ type: "INBOUND", status: "UNREAD" }),
        EmailModel.countDocuments({ type: "INBOUND", status: "READ" }),
        EmailModel.countDocuments({ type: "INBOUND", status: "AUTO_REPLIED" }),
        EmailModel.countDocuments({ type: "INBOUND", status: "REPLIED" }),
        UserModel.countDocuments(),
        settingServices.getSettings(userId),
    ]);

    return {
        totalEmails,
        unreadEmails,
        readEmails,
        autoRepliedEmails,
        repliedEmails,
        totalUsers,
        isAutoReply: settings.isAutoReply,
    };
};

export const dashboardServices = {
    getDashboardStats,
};
