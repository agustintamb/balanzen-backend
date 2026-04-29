import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import { upload } from "#config/multer.config.js";
import { uploadImageHandler, deleteImageHandler } from "#controllers/uploads.controller.js";

const router = Router();

/**
 * @openapi
 * /uploads/image:
 *   post:
 *     tags: [Uploads]
 *     summary: Sube una imagen a Cloudinary
 *     description: |
 *       Recibe un archivo multipart/form-data (campo "image") y lo sube a Cloudinary
 *       con transformaciones automáticas (q_auto, f_auto, w_800, c_limit).
 *       Retorna la URL pública de la imagen.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Imagen subida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 *       400:
 *         description: No se recibió ningún archivo
 */
router.post("/image", authMiddleware, upload.single("image"), uploadImageHandler);

/**
 * @openapi
 * /uploads/image:
 *   delete:
 *     tags: [Uploads]
 *     summary: Elimina una imagen de Cloudinary
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL pública de la imagen en Cloudinary
 *     responses:
 *       200:
 *         description: Imagen eliminada correctamente
 *       400:
 *         description: URL inválida o no proporcionada
 */
router.delete("/image", authMiddleware, deleteImageHandler);

export default router;
