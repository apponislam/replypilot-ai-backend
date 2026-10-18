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
 * List all received incoming emails (Admin).
 */
const getAllInboundEmails = catchAsync(async (req: Request, res: Response) => {
    const result = await emailServices.getAllInboundEmails(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Inbound emails retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

/**
 * Get email details with all threaded replies (Admin).
 */
const getEmailWithReplies = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await emailServices.getEmailWithReplies(id);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Email not found");
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email details and thread retrieved successfully",
        data: result,
    });
});

/**
 * Admin clicks "Generate" button from dashboard to draft an AI reply.
 */
const generateDraftReply = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { tone, instructions, customPrompt } = req.body;

    const email = await emailServices.generateDraftReply(id, {
        tone,
        instructions,
        customPrompt,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "AI draft reply generated successfully",
        data: email,
    });
});

/**
 * Admin clicks "Send" button from dashboard to send reply.
 */
const sendOutboundReply = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { replyText } = req.body;
    const adminUserId = (req as any).user?._id;

    const result = await emailServices.sendOutboundReply(id, replyText, adminUserId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Outbound reply sent and recorded successfully",
        data: result,
    });
});

/**
 * Update email status (e.g. READ, ARCHIVED).
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
 * Delete email.
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

export const emailControllers = {
    handleResendWebhook,
    getAllInboundEmails,
    getEmailWithReplies,
    generateDraftReply,
    sendOutboundReply,
    updateEmailStatus,
    deleteEmail,
};
