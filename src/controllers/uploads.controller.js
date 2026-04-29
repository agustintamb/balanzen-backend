import { uploadImage, deleteImage } from "#services/uploads.service.js";

const uploadImageHandler = async (req, res, next) => {
  try {
    const result = uploadImage(req.file);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const deleteImageHandler = async (req, res, next) => {
  try {
    await deleteImage(req.body.url);
    res.status(200).json({ success: true, message: "Imagen eliminada correctamente" });
  } catch (err) {
    next(err);
  }
};

export { uploadImageHandler, deleteImageHandler };
