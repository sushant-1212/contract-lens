import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

import fs from "fs";
import path from "path";

const app: Express = express();

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Serve compiled frontend in production
const candidatePaths = [
  path.resolve(process.cwd(), "artifacts/contract-lens/dist/public"),
  path.resolve(currentDir, "../../contract-lens/dist/public"),
  path.resolve(currentDir, "../contract-lens/dist/public"),
];
const clientDistPath = candidatePaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  logger.info({ clientDistPath }, "Serving production static frontend");
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.method !== "GET") {
      return next();
    }
    res.sendFile("index.html", { root: clientDistPath });
  });
}

export default app;
