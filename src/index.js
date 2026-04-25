import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import envConfig from "#config/env.config.js";
import swaggerSpec from "#config/swagger.config.js";
import connectDB from "#config/database.config.js";
import routes from "#routes/index.js";

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej: Postman, apps móviles nativas)
    if (!origin) return callback(null, true);

    if (envConfig.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado para origin: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// ─── MIDDLEWARES GLOBALES ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(envConfig.env === "production" ? "combined" : "dev"));

// ─── SWAGGER ──────────────────────────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use("/api/v1", routes);

// Ruta raíz
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Balanzen API",
    version: "1.2.0",
    docs: "/api/v1/health",
  });
});

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ─── ERROR HANDLER GLOBAL ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  if (err?.message?.startsWith("CORS bloqueado")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Errores de validación de Mongoose
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Duplicate key de MongoDB
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "Registro duplicado" });
  }

  res.status(err.status || 500).json({
    success: false,
    message: envConfig.env === "production" ? "Error interno del servidor" : err.message,
    ...(envConfig.env !== "production" && { stack: err.stack }),
  });
});

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  app.listen(envConfig.port, () => {
    console.log(`\n🚀  Balanzen API corriendo`);
    console.log(`    Ambiente  : ${envConfig.env}`);
    console.log(`    Puerto    : ${envConfig.port}`);
    console.log(`    Health    : ${envConfig.baseUrl}/api/v1/health\n`);
  });
};

start();
