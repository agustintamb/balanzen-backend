import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import { getCategories } from "#controllers/categories.controller.js";

const router = Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Lista todas las categorías activas
 *     description: Retorna las categorías disponibles ordenadas alfabéticamente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorías
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       icon_url:
 *                         type: string
 *                         nullable: true
 */
router.get("/", authMiddleware, getCategories);

export default router;
