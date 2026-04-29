import { Router } from "express";
import { getCategories } from "#controllers/categories.controller.js";

const router = Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Lista todas las categorías activas
 *     description: Retorna las categorías disponibles ordenadas alfabéticamente.
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
router.get("/", getCategories);

export default router;
