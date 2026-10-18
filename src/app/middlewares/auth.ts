import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import catchAsync from "../../utils/catchAsync";
import config from "../config";
import { UserModel } from "../modules/auth/auth.model";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { UserRole } from "../modules/auth/auth.interface";

const auth = (...roles: (UserRole | UserRole[])[]) => {
    const requiredRoles = roles.flat();

    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        let token = req.headers.authorization;

        if (token?.startsWith("Bearer ")) token = token.slice(7);

        if (!token) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "Access denied. Please log in to continue.");
        }

        let decoded: jwt.JwtPayload;
        try {
            decoded = jwt.verify(token, config.jwt_access_secret as string) as jwt.JwtPayload & {
                _id: string;
                role: string;
            };
        } catch (err: any) {
            if (err.name === "TokenExpiredError") {
                throw new ApiError(httpStatus.UNAUTHORIZED, "Your session has expired. Please log in again.");
            }
            throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication failed. Please log in again.");
        }

        const user = await UserModel.findById(decoded._id);

        if (!user) {
            throw new ApiError(httpStatus.NOT_FOUND, "User account not found. Please sign up or log in again.");
        }

        if (!user.isActive) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "Your account is currently deactivated. Please contact support.");
        }

        if (user.role !== decoded?.role) {
            throw new ApiError(httpStatus.FORBIDDEN, "Access denied. Please log in again with the correct account.");
        }

        if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
            throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to access this resource.");
        }

        req.user = user;
        next();
    });
};

export default auth;
