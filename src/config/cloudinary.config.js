import { v2 as cloudinary } from "cloudinary";
import envConfig from "./env.config.js";

const { cloudinary: cloudinaryConfig, env } = envConfig;

cloudinary.config({
  cloud_name: cloudinaryConfig.cloudName,
  api_key: cloudinaryConfig.apiKey,
  api_secret: cloudinaryConfig.apiSecret,
});

// Prefijo de carpeta por ambiente para separar assets
const getFolderPrefix = () => {
  const prefixes = {
    local: "balanzen/local",
    testing: "balanzen/testing",
    production: "balanzen/prod",
  };
  return prefixes[env] || "balanzen/local";
};

export { v2 as cloudinary } from "cloudinary";
export const folderPrefix = getFolderPrefix();
