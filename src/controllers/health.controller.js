import mongoose from "mongoose";
import envConfig from "#config/env.config.js";

const { env } = envConfig;

const healthCheck = (req, res) => {
  const dbState = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  /* v8 ignore start -- fallbacks defensivos: readyState siempre es 0-3 y la conexión está activa en test */
  const dbStatus = dbState[mongoose.connection.readyState] || "unknown";
  const dbName = mongoose.connection.name || null;
  /* v8 ignore stop */

  res.status(200).json({
    success: true,
    message: "Balanzen API funcionando",
    environment: env,
    timestamp: new Date().toISOString(),
    database: { status: dbStatus, name: dbName },
    uptime: `${Math.floor(process.uptime())}s`,
  });
};

export { healthCheck };
