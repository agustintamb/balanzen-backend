import path from "node:path";
import dotenv from "dotenv";

const env = process.env.NODE_ENV || "local";

const envFile = `.env.${env}`;
const envPath = path.resolve(process.cwd(), envFile);

if (env !== "test") {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn(`⚠️  No se encontró ${envFile}, usando variables de entorno del sistema`);
  } else {
    console.log(`✅  Ambiente cargado: ${envFile}`);
  }
}

export default {
  env,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
  port: process.env.PORT || 3001,
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [],
};
