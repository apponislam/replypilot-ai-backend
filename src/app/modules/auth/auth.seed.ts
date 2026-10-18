import bcrypt from "bcrypt";
import { UserModel } from "./auth.model";
import config from "../../config";

export const seedSuperAdmin = async () => {
    try {
        const { email, password, name, phone } = config.initialAdmin || {};

        if (!name) {
            console.log("⚠️ INITIAL_ADMIN_NAME is not provided in env, skipping admin seeding.");
            return;
        }
        if (!email) {
            console.log("⚠️ INITIAL_ADMIN_EMAIL is not provided in env, skipping admin seeding.");
            return;
        }
        if (!password) {
            console.log("⚠️ INITIAL_ADMIN_PASSWORD is not provided in env, skipping admin seeding.");
            return;
        }
        if (!phone) {
            console.log("⚠️ INITIAL_ADMIN_PHONE is not provided in env, skipping admin seeding.");
            return;
        }

        const adminExists = await UserModel.findOne({
            role: "ADMIN",
        });

        if (!adminExists) {
            console.log("📝 No admin found, creating one...");

            const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

            const adminUser = {
                name: name,
                email: email,
                password: hashedPassword,
                role: "ADMIN" as const,
                phone: phone,
                isActive: true,
                isEmailVerified: true,
            };

            await UserModel.create(adminUser);

            console.log("✅ Admin created:", email);
        } else {
            console.log("✅ Admin already exists, skipping creation");
        }
    } catch (error) {
        console.error("❌ Error seeding admin:", error);
    }
};
