import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import roleMiddleware from "#middlewares/role.middleware.js";
import {
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from "#controllers/admin.controller.js";

const router = Router();

router.use(authMiddleware, roleMiddleware(["ADMIN"]));

/**
 * @openapi
 * /admin/categories:
 *   post:
 *     tags: [Admin]
 *     summary: Crea una nueva categoría
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               icon_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoría creada
 *       409:
 *         description: Ya existe una categoría con ese nombre
 */
router.post("/categories", adminCreateCategory);

/**
 * @openapi
 * /admin/categories/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Edita una categoría existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               icon_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *       404:
 *         description: Categoría no encontrada
 *       409:
 *         description: Ya existe una categoría con ese nombre
 */
router.put("/categories/:id", adminUpdateCategory);

/**
 * @openapi
 * /admin/categories/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Elimina (soft delete) una categoría
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categoría eliminada
 *       404:
 *         description: Categoría no encontrada
 */
router.delete("/categories/:id", adminDeleteCategory);

export default router;
