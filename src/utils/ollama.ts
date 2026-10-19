import { Ollama } from "ollama";
import config from "../app/config";

let ollamaClient: Ollama | null = null;

export const getOllamaClient = (): Ollama => {
    if (!ollamaClient) {
        ollamaClient = new Ollama({
            host: config.ollama.host || "http://127.0.0.1:11434",
        });
    }
    return ollamaClient;
};

export interface IGenerateReplyOptions {
    from?: string;
    subject: string;
    content: string;
    tone?: "professional" | "friendly" | "concise" | "formal" | "casual";
    instructions?: string;
    customPrompt?: string;
}

/**
 * Generate an AI email reply using local Ollama model (e.g. llama3.2:3b).
 */
export const generateEmailReply = async (
    options: IGenerateReplyOptions,
): Promise<{
    reply: string;
    model: string;
}> => {
    const client = getOllamaClient();
    const model = config.ollama.model || "llama3.2:3b";
    const tone = options.tone || "professional";

    const systemPrompt = `You are ReplyPilot AI, an intelligent, helpful, and courteous customer support email assistant.
Your goal is to draft a clean, professional, and context-appropriate reply to the received email.
Tone: ${tone}.
${options.instructions ? `Special Instructions: ${options.instructions}` : ""}
Rules:
- Directly provide only the email response content (no extra meta-talk, notes, or chat commentary).
- Greet the sender politely (e.g. "Hello," or "Hi [First Name],"). Never address someone by their raw email username or numbers (e.g. do NOT say "Dear Appon2003").
- Maintain proper email sign-offs (e.g. "Best regards,\nThe ReplyPilot Team").
- If the sender is asking whether the system or AI is working, cheerfully confirm that ReplyPilot AI is fully operational and ready to assist them.
- Do not invent false facts if not present in the context.`;

    const userPrompt =
        options.customPrompt ||
        `From: ${options.from || "Client"}
Subject: ${options.subject}
Message Body:
"""
${options.content || "(No text content)"}
"""

Please draft a suitable reply to this email.`;

    try {
        const response = await client.chat({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        return {
            reply: response.message.content.trim(),
            model,
        };
    } catch (error: any) {
        console.error("❌ [Ollama] Failed to generate email reply:", error.message);
        throw error;
    }
};

/**
 * Summarize an email into a concise executive summary.
 */
export const summarizeEmail = async (subject: string, content: string): Promise<string> => {
    const client = getOllamaClient();
    const model = config.ollama.model || "llama3.2:3b";

    try {
        const response = await client.chat({
            model,
            messages: [
                {
                    role: "system",
                    content: "You are an email summarizer. Provide a concise 1-2 sentence summary of the key message and any requested action items.",
                },
                {
                    role: "user",
                    content: `Subject: ${subject}\n\nContent:\n${content}`,
                },
            ],
        });

        return response.message.content.trim();
    } catch (error: any) {
        console.error("❌ [Ollama] Failed to summarize email:", error.message);
        return "";
    }
};

/**
 * List available Ollama models.
 */
export const listOllamaModels = async () => {
    const client = getOllamaClient();
    try {
        const result = await client.list();
        return result.models.map((m) => m.name);
    } catch (error: any) {
        console.error("❌ [Ollama] Could not reach Ollama daemon:", error.message);
        return [];
    }
};

export default {
    getOllamaClient,
    generateEmailReply,
    summarizeEmail,
    listOllamaModels,
};
