import { Router } from "express";
import { emailControllers } from "./email.controllers";
import auth from "../../middlewares/auth";

const router = Router();


/**
 * AI & Management Endpoints for Inbound Emails (Protected):
 */
router.get("/ai/models", auth(["ADMIN", "USER"]), emailControllers.getOllamaModels);
router.post("/:id/generate-reply", auth(["ADMIN", "USER"]), emailControllers.generateAiReply);
router.post("/:id/send-reply", auth(["ADMIN", "USER"]), emailControllers.sendReply);

router.get("/", auth(["ADMIN", "USER"]), emailControllers.getAllEmails);
router.get("/:id", auth(["ADMIN", "USER"]), emailControllers.getEmailById);
router.patch("/:id/status", auth(["ADMIN", "USER"]), emailControllers.updateEmailStatus);
router.delete("/:id", auth(["ADMIN"]), emailControllers.deleteEmail);

export const emailRoutes = router;

