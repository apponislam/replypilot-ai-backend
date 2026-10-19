import { Router } from "express";
import { userReplyControllers } from "./userReply.controllers";
import auth from "../../middlewares/auth";

const router = Router();

router.post("/generate", auth(), userReplyControllers.generateReply);
router.post("/:id/send", auth(), userReplyControllers.sendReply);
router.get("/", auth(), userReplyControllers.getUserReplies);
router.get("/:id", auth(), userReplyControllers.getUserReplyById);
router.delete("/:id", auth(), userReplyControllers.deleteUserReply);

export const userReplyRoutes = router;
