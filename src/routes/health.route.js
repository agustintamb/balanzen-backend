import { Router } from "express";
import { healthCheck } from "../controllers/health.controller.js";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check de la API
 *     description: Retorna el estado del servidor y la conexión a la base de datos
 *     responses:
 *       200:
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Balanzen API funcionando
 *                 environment:
 *                   type: string
 *                   example: local
 *                 timestamp:
 *                   type: string
 *                   example: 2025-01-01T00:00:00.000Z
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: connected
 *                     name:
 *                       type: string
 *                       example: balanzen_local
 *                 uptime:
 *                   type: string
 *                   example: 120s
 */
router.get("/", healthCheck);

export default router;
