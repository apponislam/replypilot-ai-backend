import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { emailRoutes } from "../modules/email/email.routes";
import { settingRoutes } from "../modules/setting/setting.routes";
import { userReplyRoutes } from "../modules/userReply/userReply.routes";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes";

const router = express.Router();

const moduleRoutes = [
    {
        path: "/auth",
        route: authRoutes,
    },
    {
        path: "/email",
        route: emailRoutes,
    },
    {
        path: "/emails",
        route: emailRoutes,
    },
    {
        path: "/settings",
        route: settingRoutes,
    },
    {
        path: "/setting",
        route: settingRoutes,
    },
    {
        path: "/user-replies",
        route: userReplyRoutes,
    },
    {
        path: "/user-reply",
        route: userReplyRoutes,
    },
    {
        path: "/dashboard",
        route: dashboardRoutes,
    },
];




moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
