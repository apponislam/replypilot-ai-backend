import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { emailRoutes } from "../modules/email/email.routes";

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
];



moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
