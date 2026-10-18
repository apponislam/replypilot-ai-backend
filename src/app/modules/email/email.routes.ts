import { Router } from "express";
import { emailControllers } from "./email.controllers";
import auth from "../../middlewares/auth";

const router = Router();

/**
 * Admin Email Management Routes (Protected to ADMIN only):
 */
router.get("/", auth(["ADMIN"]), emailControllers.getAllInboundEmails);
router.get("/:id", auth(["ADMIN"]), emailControllers.getEmailWithReplies);
router.post("/:id/generate-reply", auth(["ADMIN"]), emailControllers.generateDraftReply);
router.post("/:id/send-reply", auth(["ADMIN"]), emailControllers.sendOutboundReply);
router.patch("/:id/status", auth(["ADMIN"]), emailControllers.updateEmailStatus);
router.delete("/:id", auth(["ADMIN"]), emailControllers.deleteEmail);

export const emailRoutes = router;
