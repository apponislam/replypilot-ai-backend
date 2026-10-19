import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { dashboardServices } from "./dashboard.services";

/**
 * Get basic dashboard statistics.
 */
const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const result = await dashboardServices.getDashboardStats(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Dashboard statistics retrieved successfully",
        data: result,
    });
});

export const dashboardControllers = {
    getDashboardStats,
};
