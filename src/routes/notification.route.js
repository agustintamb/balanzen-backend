import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import { getNotifications } from "#controllers/notification.controller.js";

const router = Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Lista notificaciones del usuario autenticado
 *     description: |
 *       Retorna las notificaciones paginadas con el total de no leídas.
 *       Se puede filtrar por `read=true` o `read=false`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado de lectura
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
 *         description: Lista de notificaciones con unread_count y paginación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 unread_count:
 *                   type: integer
 *                 notifications:
 *                   type: array
 *                 pagination:
 *                   type: object
 */
router.get("/", authMiddleware, getNotifications);

export default router;
