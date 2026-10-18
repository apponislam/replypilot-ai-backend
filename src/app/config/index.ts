import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
    ip: process.env.IP,
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    mongodb_url: process.env.MONGODB_URL,
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    jwt_access_secret: process.env.JWT_ACCESS_SECRET,
    jwt_access_expire: process.env.JWT_ACCESS_EXPIRE,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    jwt_refresh_expire: process.env.JWT_REFRESH_EXPIRE,
    jwt_password_reset_secret: process.env.JWT_PASSWORD_RESET_SECRET,
    client_url: process.env.CLIENT_URL,
    server_url: process.env.SERVER_URL || `http://${process.env.IP || 'localhost'}:${process.env.PORT || 5000}`,
    resend: {
        api_key: process.env.RESEND_API_KEY,
        from_email: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    },
    initialAdmin: {
        name: process.env.INITIAL_ADMIN_NAME,
        email: process.env.INITIAL_ADMIN_EMAIL,
        password: process.env.INITIAL_ADMIN_PASSWORD,
        phone: process.env.INITIAL_ADMIN_PHONE,
    },
};
