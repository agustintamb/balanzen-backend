import http from "node:http";

import envConfig from "#config/env.config.js";
import connectDB from "#config/database.config.js";
import { initSocket } from "#config/socket.config.js";
import { startPublicationJobs } from "#jobs/publication-expiry.job.js";
import app from "#app.js";

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  startPublicationJobs();

  httpServer.listen(envConfig.port, () => {
    console.log(`\n🚀  Balanzen API corriendo`);
    console.log(`    Ambiente  : ${envConfig.env}`);
    console.log(`    Puerto    : ${envConfig.port}`);
    console.log(`    Health    : ${envConfig.baseUrl}/api/v1/health\n`);
    console.log(`📚  Documentación disponible en: ${envConfig.baseUrl}/api/docs\n`);
  });
};

start();
