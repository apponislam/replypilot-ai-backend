import { Resend } from "resend";
import config from "../app/config";

let resendClient: Resend | null = null;

const getResendClient = (): Resend | null => {
    if (!resendClient) {
        if (!config.resend.api_key) {
            return null;
        }
        resendClient = new Resend(config.resend.api_key);
    }
    return resendClient;
};

export const sendMail = async (to: string | string[], subject: string, html: string, from?: string) => {
    try {
        const client = getResendClient();
        if (!client) {
            console.warn(`⚠️ [Resend] RESEND_API_KEY is missing. Email skipped for: ${Array.isArray(to) ? to.join(", ") : to} [Subject: ${subject}]`);
            return null;
        }

        const recipients = Array.isArray(to) ? to : [to];
        const fromAddress = from || config.resend.from_email || "ReplyPilot <replypilotai@apponislam.top>";

        const { data, error } = await client.emails.send({
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

export const getReceivedEmail = async (emailId: string) => {
    try {
        const client = getResendClient();
        if (!client) {
            console.warn("⚠️ [Resend] RESEND_API_KEY is missing. Cannot fetch received email:", emailId);
            return null;
        }

        const { data, error } = await client.emails.receiving.get(emailId);
        if (error) {
            console.error(`❌ [Resend] Failed to fetch received email ${emailId}:`, error);
            return null;
        }

        return data;
    } catch (error: any) {
        console.error(`❌ [Resend] Error fetching received email ${emailId}:`, error);
        return null;
    }
};

export default {
    sendMail,
    getReceivedEmail,
    getResendClient,
};

