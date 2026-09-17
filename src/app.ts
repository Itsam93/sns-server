import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { notFoundMiddleware } from "./middleware/notFoundMiddleware.js";
import routes from "./routes/index.js";

const app = express();

const isProduction =
  process.env.NODE_ENV === "production";

const clientUrl =
  process.env.CLIENT_URL?.trim();

if (!clientUrl) {
  throw new Error(
    "CLIENT_URL is not configured",
  );
}

let allowedOrigin: string;

try {
  allowedOrigin =
    new URL(clientUrl).origin;
} catch {
  throw new Error(
    "CLIENT_URL must be a valid URL",
  );
}

if (
  isProduction &&
  !allowedOrigin.startsWith("https://")
) {
  throw new Error(
    "CLIENT_URL must use HTTPS in production",
  );
}

const allowedOrigins = new Set([
  allowedOrigin,
  "https://www.stitchesnspices.org",
  "https://sns-frontend-rouge.vercel.app",
  "http://localhost:5173",
]);

app.disable("x-powered-by");

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          "CORS origin not allowed",
        ),
      );
    },
    credentials: true,
    methods: [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
    ],
    optionsSuccessStatus: 204,
  }),
);

const globalRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 150,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message:
        "Too many requests. Please try again later.",
    },
  });

app.use(globalRateLimiter);

app.use(
  express.json({
    limit: "100kb",
  }),
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb",
  }),
);

app.use(cookieParser());

app.get(
  "/api/health",
  (_req, res) => {
    res.status(200).json({
      success: true,
      message:
        "SnS API is running",
    });
  },
);

app.use("/api", routes);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;