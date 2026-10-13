import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireAuth, type AuthenticatedRequest } from "./middleware/requireAuth.js";
import filesRouter from "./routes/files.js";
import aiRouter from "./routes/ai.js";
const app = express();

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "BrainScribe backend is running",
    timestamp: new Date().toISOString(),
  });
});
app.get(
  "/api/auth/me",
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);
app.use("/api/files", filesRouter);
app.use("/api/ai", aiRouter);
app.listen(PORT, () => {
  console.log(`BrainScribe server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
