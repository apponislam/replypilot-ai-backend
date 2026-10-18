import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import sharp from "sharp";

// Ensure profile image upload directory exists
const profileImageDir = path.join(process.cwd(), "uploads", "profile-images");
if (!fs.existsSync(profileImageDir)) {
    fs.mkdirSync(profileImageDir, { recursive: true });
}

// Multer memory storage
const storage = multer.memoryStorage();

// File filter (only allow images)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Image must be JPG, PNG, or WEBP"));
    }
};

// Multer setup
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Helper to generate unique filename
const generateFileName = (prefix: string) => {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 10000);
    return `${prefix}-${timestamp}-${randomNum}.webp`;
};

// Helper to process image buffer to WebP file
const processImageFile = async (file: Express.Multer.File) => {
    if (!fs.existsSync(profileImageDir)) {
        fs.mkdirSync(profileImageDir, { recursive: true });
    }

    const newName = generateFileName("profile");
    const outputPath = path.join(profileImageDir, newName);

    await sharp(file.buffer).webp({ quality: 80 }).toFile(outputPath);

    file.filename = `/uploads/profile-images/${newName}`;
    file.path = outputPath;
    file.mimetype = "image/webp";
};

// Middleware for profile image upload
export const uploadProfileImage = (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.fields([
        { name: "profileImage", maxCount: 1 },
        { name: "image", maxCount: 1 },
    ]);

    uploadMiddleware(req, res, async (err) => {
        if (err) return next(err);

        try {
            if (req.files && !Array.isArray(req.files)) {
                const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] };
                const profileFile = filesMap["profileImage"]?.[0] || filesMap["image"]?.[0];
                if (profileFile) {
                    await processImageFile(profileFile);
                }
            } else if (req.file) {
                await processImageFile(req.file);
            }
        } catch (error) {
            return next(error);
        }

        next();
    });
};

export const uploadUserFiles = uploadProfileImage;
export default uploadProfileImage;
