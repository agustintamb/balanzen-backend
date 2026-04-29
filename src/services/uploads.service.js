import { cloudinary } from "#config/cloudinary.config.js";

const uploadImage = (file) => {
  if (!file) {
    const err = new Error("No se recibió ningún archivo");
    err.status = 400;
    throw err;
  }
  return { url: file.path };
};

const deleteImage = async (url) => {
  if (!url) {
    const err = new Error("Se requiere la URL de la imagen");
    err.status = 400;
    throw err;
  }

  // Extrae el public_id desde la URL de Cloudinary
  // Formato: https://res.cloudinary.com/<cloud>/image/upload/v<version>/<folder>/<public_id>.<ext>
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  if (!match) {
    const err = new Error("URL de imagen inválida");
    err.status = 400;
    throw err;
  }

  const publicId = match[1];
  const result = await cloudinary.uploader.destroy(publicId);

  if (result.result !== "ok" && result.result !== "not found") {
    const err = new Error("No se pudo eliminar la imagen");
    err.status = 500;
    throw err;
  }
};

export { uploadImage, deleteImage };
