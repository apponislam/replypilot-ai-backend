import { Router } from "express";
import { settingControllers } from "./setting.controllers";
import auth from "../../middlewares/auth";

const router = Router();

router.get("/", auth(), settingControllers.getSettings);
router.patch("/", auth(), settingControllers.updateSettings);

export const settingRoutes = router;
