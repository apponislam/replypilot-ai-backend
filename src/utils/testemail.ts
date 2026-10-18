import { sendMail } from "./resend";

export const testEmail = async () => {
    try {
        const result = await sendMail("apponislamdev@gmail.com", "Test Email from ReplyPilot", "<h1>✅ Resend Test Successful!</h1><p>This is a test email from ReplyPilot via Resend.</p>");
        console.log("📨 Test email sent successfully!", result);
    } catch (err) {
        console.error("❌ Failed to send test email:", err);
    }
};
