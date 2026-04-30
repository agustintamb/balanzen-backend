import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "#controllers/notification.controller.js";

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

/**
 * @openapi
 * /notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Marca todas las notificaciones del usuario como leídas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones marcadas como leídas. Incluye cantidad actualizada.
 */
router.put("/read-all", authMiddleware, markAllNotificationsAsRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Marca una notificación como leída
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
 *         description: Notificación marcada como leída
 *       403:
 *         description: La notificación no pertenece al usuario
 *       404:
 *         description: Notificación no encontrada
 */
router.put("/:id/read", authMiddleware, markNotificationAsRead);

export default router;
