import { Resend } from "resend";
import config from "../app/config";

const resend = new Resend(config.resend.api_key);

export const sendMail = async (to: string | string[], subject: string, html: string, from?: string) => {
    try {
        const recipients = Array.isArray(to) ? to : [to];
        const fromAddress = from || config.resend.from_email || "ReplyPilot <onboarding@resend.dev>";

        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: recipients,
            subject,
            html,
        });

        if (error) {
            console.error("Resend email delivery error:", error);
            return null;
        }

        return data;
    } catch (error: any) {
        console.error("Resend email error:", error);
        return null;
    }
};

export default {
    sendMail,
};
