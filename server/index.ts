import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  handleWebhook,
  getConfig,
} from "./routes/payment";
import {
  uploadFiles,
  getUploadStatus,
  getUserUploads,
} from "./routes/uploads";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Payment routes
  app.post("/api/payment/create-order", createOrder);
  app.post("/api/payment/verify", verifyPayment);
  app.get("/api/payment/status/:paymentId", getPaymentStatus);
  app.post("/api/payment/webhook", handleWebhook);
  app.get("/api/payment/config", getConfig);

  // File upload routes
  app.post("/api/uploads/files", uploadFiles);
  app.get("/api/uploads/status/:uploadId", getUploadStatus);
  app.get("/api/uploads/user/:userId", getUserUploads);

  return app;
}
