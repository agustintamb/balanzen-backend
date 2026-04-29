import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import roleMiddleware from "#middlewares/role.middleware.js";
import {
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminListPublications,
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

/**
 * @openapi
 * /admin/publications:
 *   get:
 *     tags: [Admin]
 *     summary: Lista todas las publicaciones (todos los estados, todos los comercios)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, RESERVED, DELIVERED, CANCELLED, EXPIRED]
 *       - in: query
 *         name: commerce_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista paginada de publicaciones
 */
router.get("/publications", adminListPublications);

export default router;
