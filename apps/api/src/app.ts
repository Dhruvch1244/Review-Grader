import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import { classesRouter } from "./routes/classes";
import { teamsRouter } from "./routes/teams";
import { studentsRouter } from "./routes/students";
import { scoresRouter } from "./routes/scores";
import { dimensionsRouter } from "./routes/dimensions";
import { dimensionScoresRouter } from "./routes/dimension-scores";
import { askedQuestionsRouter } from "./routes/asked-questions";
import { reviewSessionsRouter } from "./routes/review-sessions";
import { reviewsRouter } from "./routes/reviews";
import { normalizeRouter } from "./routes/normalize";
import { exportRouter } from "./routes/export";
import { resetAllRouter } from "./routes/reset-all";

export function createApp() {
  const app = express();

  // Dev-only: Angular's `ng serve` runs on its own port and proxies /api/*
  // to this server (see apps/web/proxy.conf.json); in production the
  // Angular build is served from this same origin, so CORS is a no-op.
  if (process.env.NODE_ENV !== "production") {
    app.use(cors());
  }

  app.use(express.json());

  app.use("/api/classes", classesRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/students", studentsRouter);
  app.use("/api/scores", scoresRouter);
  app.use("/api/dimensions", dimensionsRouter);
  app.use("/api/dimension-scores", dimensionScoresRouter);
  app.use("/api/asked-questions", askedQuestionsRouter);
  app.use("/api/review-sessions", reviewSessionsRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/normalize", normalizeRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/reset-all", resetAllRouter);

  // Serve the built Angular app (production only) - mounted AFTER the API
  // routes above so it never shadows them. The static dir is resolved at
  // runtime since it doesn't exist yet during `npm run dev`.
  const staticDir = path.join(__dirname, "../public");
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  // JSON-formatted error handler for anything a route throws, instead of
  // Express's default HTML error page - keeps failures easy to read while
  // debugging (api-client.ts's offline fallback only checks res.ok, so the
  // body shape doesn't matter to the client itself).
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : "internal error" });
  });

  return app;
}
