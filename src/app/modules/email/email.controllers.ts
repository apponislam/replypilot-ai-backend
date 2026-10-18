import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import ApiError from "../../../errors/ApiError";
import { emailServices } from "./email.services";

/**
 * Handle incoming Resend webhook HTTP POST.
 */
const handleResendWebhook = async (req: Request, res: Response) => {
    try {
        const rawBody = (req as any).rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

        if (!rawBody) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Empty webhook payload",
            });
        }

        // Verify Svix signature and get typed event payload
        const event = emailServices.verifyWebhookSignature(rawBody, req.headers);

        // Process webhook event in service
        const result = await emailServices.processWebhookEvent(event);

        return res.status(httpStatus.OK).json({
            success: true,
            message: "Webhook processed successfully",
            data: result,
        });
    } catch (err: any) {
        console.error("❌ [Resend Webhook Controller] Error handling webhook:", err.message);
        const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Failed to process webhook",
        });
    }
};

/**
 * List all received emails (Protected).
 */
const getAllEmails = catchAsync(async (req: Request, res: Response) => {
    const result = await emailServices.getAllEmails(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Emails retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

/**
 * Get single email by ID (Protected).
 */
const getEmailById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const email = await emailServices.getEmailById(id);

    if (!email) {
        throw new ApiError(httpStatus.NOT_FOUND, "Email not found");
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email retrieved successfully",
        data: email,
    });
});

/**
 * Update email status (Protected).
 */
const updateEmailStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Status is required");
    }

    const updated = await emailServices.updateEmailStatus(id, status);
    if (!updated) {
        throw new ApiError(httpStatus.NOT_FOUND, "Email not found");
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email status updated successfully",
        data: updated,
    });
});

/**
 * Delete email (Protected Admin).
 */
const deleteEmail = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const deleted = await emailServices.deleteEmail(id);

    if (!deleted) {
        throw new ApiError(httpStatus.NOT_FOUND, "Email not found");
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email deleted successfully",
        data: deleted,
    });
});

/**
 * Generate AI reply using Ollama (Protected).
 */
const generateAiReply = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { tone, instructions, customPrompt } = req.body;

    const email = await emailServices.generateAiReply(id, {
        tone,
        instructions,
        customPrompt,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "AI reply generated successfully using Ollama",
        data: email,
    });
});

/**
 * Send reply to the email sender via Resend (Protected).
 */
const sendReply = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { replyContent } = req.body;

    const email = await emailServices.sendReply(id, replyContent);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Reply sent successfully",
        data: email,
    });
});

/**
 * Get available Ollama models (Protected).
 */
const getOllamaModels = catchAsync(async (_req: Request, res: Response) => {
    const models = await emailServices.getOllamaModels();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Ollama models retrieved successfully",
        data: models,
    });
});

export const emailControllers = {
    handleResendWebhook,
    getAllEmails,
    getEmailById,
    updateEmailStatus,
    deleteEmail,
    generateAiReply,
    sendReply,
    getOllamaModels,
};

