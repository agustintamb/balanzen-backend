import mongoose from "mongoose";
import envConfig from "#config/env.config.js";

const { mongodbUri, env } = envConfig;

const connectDB = async () => {
  if (!mongodbUri) {
    console.error("❌  MONGODB_URI no está definido en las variables de entorno");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongodbUri, {
      // Opciones recomendadas para producción
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`🍃  MongoDB conectado [${env}]: ${conn.connection.host}`);
    console.log(`    Base de datos: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌  Error conectando a MongoDB:", error.message);
    process.exit(1);
  }
};

// Eventos de conexión
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB desconectado");
});

mongoose.connection.on("error", (err) => {
  console.error("❌  Error de MongoDB:", err.message);
});

// Cierre limpio al terminar el proceso
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔌  Conexión MongoDB cerrada por SIGINT");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  console.log("🔌  Conexión MongoDB cerrada por SIGTERM");
  process.exit(0);
});

export default connectDB;
