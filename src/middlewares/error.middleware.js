import envConfig from "#config/env.config.js";

// Error handler global. Debe registrarse al final, con la firma de 4 argumentos
// que Express usa para reconocerlo como manejador de errores.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
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
};

export default errorHandler;
