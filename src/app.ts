import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import notFound from "./errors/notFound";
import globalErrorHandler from "./errors/globalErrorhandler";
import router from "./app/routes";
import { emailControllers } from "./app/modules/email/email.controllers";

const app: Application = express();

// ==========================================
// Resend Webhook - Must be BEFORE CORS
// ==========================================
app.post(
    "/api/v1/email/webhook",
    express.raw({ type: "application/json" }),
    (req: any, _res: Response, next: NextFunction) => {
        if (Buffer.isBuffer(req.body)) {
            req.rawBody = req.body.toString("utf8");
            try {
                req.body = JSON.parse(req.rawBody);
            } catch {
                req.body = {};
            }
        }
        next();
    },
    emailControllers.handleResendWebhook
);

const corsOptions = {
    origin: [
        "http://localhost:3000",
        "http://localhost:3030",
        "http://10.10.7.24:3030",
        "http://10.10.26.171:3030",
        "https://replypilot.apponislam.top",
        "http://replypilot.apponislam.top",
        "https://replypilotapi.apponislam.top",
        "http://replypilotapi.apponislam.top",
        "https://ollama.apponislam.top",
        "http://ollama.apponislam.top",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};


app.use(cors(corsOptions));


app.use(
    express.json({
        verify: (req: any, _res, buf) => {
            req.rawBody = buf.toString("utf8");
        },
    })
);
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use("/api/v1", router);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
