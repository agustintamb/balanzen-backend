import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import roleMiddleware from "#middlewares/role.middleware.js";
import { getSummary } from "#controllers/metrics.controller.js";

const router = Router();

/**
 * @openapi
 * /metrics/summary:
 *   get:
 *     tags: [Metrics]
 *     summary: Métricas generales del comercio autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen de publicaciones y reservas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total_publications:
 *                   type: integer
 *                 active_publications:
 *                   type: integer
 *                 total_reservations:
 *                   type: integer
 *                 total_delivered:
 *                   type: integer
 *                 total_cancelled:
 *                   type: integer
 *                 conversion_rate:
 *                   type: number
 */
router.get("/summary", authMiddleware, roleMiddleware(["COMERCIO"]), getSummary);

export default router;
