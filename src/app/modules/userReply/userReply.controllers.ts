import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import ApiError from "../../../errors/ApiError";
import { userReplyServices } from "./userReply.services";

const generateReply = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const result = await userReplyServices.generateReply(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "AI reply generated successfully",
        data: result,
    });
});

const sendReply = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const replyId = req.params.id as string;
    const { editedReply } = req.body;

    const result = await userReplyServices.sendReply(userId, replyId, editedReply);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Reply sent successfully from ReplyPilot",
        data: result,
    });
});

const getUserReplies = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const result = await userReplyServices.getUserReplies(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User replies retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getUserReplyById = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const id = req.params.id as string;

    const result = await userReplyServices.getUserReplyById(userId, id);
    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Reply not found");
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Reply retrieved successfully",
        data: result,
    });
});

const deleteUserReply = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const id = req.params.id as string;

    const result = await userReplyServices.deleteUserReply(userId, id);
    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Reply not found");
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Reply deleted successfully",
        data: result,
    });
});

export const userReplyControllers = {
    generateReply,
    sendReply,
    getUserReplies,
    getUserReplyById,
    deleteUserReply,
};
