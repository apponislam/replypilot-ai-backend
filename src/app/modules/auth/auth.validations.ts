import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["ADMIN", "USER"]).default("USER"),
    phone: z.string().optional(),
    profileImage: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const verifyEmailSchema = z.object({
    token: z.string(),
    email: z.string().email(),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    profileImage: z.string().optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
});

export const updateEmailSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const resendEmailUpdateSchema = z.object({
    password: z.string(),
});
