import { Router } from "express";
import { userReplyControllers } from "./userReply.controllers";
import auth from "../../middlewares/auth";

const router = Router();

router.post("/generate", auth(["USER", "ADMIN"]), userReplyControllers.generateReply);
router.post("/:id/send", auth(["USER", "ADMIN"]), userReplyControllers.sendReply);
router.get("/", auth(["USER", "ADMIN"]), userReplyControllers.getUserReplies);
router.get("/:id", auth(["USER", "ADMIN"]), userReplyControllers.getUserReplyById);
router.delete("/:id", auth(["USER", "ADMIN"]), userReplyControllers.deleteUserReply);

export const userReplyRoutes = router;
