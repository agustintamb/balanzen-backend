import mongoose from "mongoose";
import envConfig from "../config/env.config.js";

const { env } = envConfig;

const healthCheck = (req, res) => {
  const dbState = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(200).json({
    success: true,
    message: "Balanzen API funcionando",
    environment: env,
    timestamp: new Date().toISOString(),
    database: {
      status: dbState[mongoose.connection.readyState] || "unknown",
      name: mongoose.connection.name || null,
    },
    uptime: `${Math.floor(process.uptime())}s`,
  });
};

export { healthCheck };
