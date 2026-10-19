import { Router } from "express";
import auth from "../../middlewares/auth";
import { dashboardControllers } from "./dashboard.controllers";

const router = Router();

router.get("/", auth(["ADMIN", "USER"]), dashboardControllers.getDashboardStats);
router.get("/stats", auth(["ADMIN", "USER"]), dashboardControllers.getDashboardStats);

export const dashboardRoutes = router;
