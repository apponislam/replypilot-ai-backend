import { Router } from "express";
import { settingControllers } from "./setting.controllers";
import auth from "../../middlewares/auth";

const router = Router();

router.get("/", auth(["ADMIN", "USER"]), settingControllers.getSettings);
router.patch("/", auth(["ADMIN", "USER"]), settingControllers.updateSettings);

export const settingRoutes = router;
