import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import envConfig from "#config/env.config.js";
import swaggerSpec from "#config/swagger.config.js";
import routes from "#routes/index.js";
import errorHandler from "#middlewares/error.middleware.js";

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
// Sin logging de requests durante los tests para no ensuciar la salida
/* v8 ignore next 3 -- el logging HTTP no se monta en el ambiente de test */
if (envConfig.env !== "test") {
  app.use(morgan(envConfig.env === "production" ? "combined" : "dev"));
}

// ─── SWAGGER ──────────────────────────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use("/api/v1", routes);

// Ruta raíz
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Balanzen API",
    version: "1.3.1",
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
app.use(errorHandler);

export default app;
