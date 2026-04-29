import { Router } from "express";
import { body } from "express-validator";
import authMiddleware from "#middlewares/auth.middleware.js";
import validate from "#middlewares/validate.middleware.js";
import {
  listChatsHandler,
  getMessagesHandler,
  sendMessageHandler,
} from "#controllers/chat.controller.js";

const router = Router();

/**
 * @openapi
 * /chats:
 *   get:
 *     tags: [Chat]
 *     summary: Lista conversaciones del usuario autenticado
 *     description: |
 *       Retorna todos los chats del usuario (consumidor o comercio) con su contraparte,
 *       título de la publicación, último mensaje y estado del pedido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de conversaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 chats:
 *                   type: array
 */
router.get("/", authMiddleware, listChatsHandler);

/**
 * @openapi
 * /chats/{orderId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Mensajes de un chat paginados
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
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
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de mensajes con paginación
 *       403:
 *         description: Sin acceso al chat
 *       404:
 *         description: Pedido no encontrado
 */
router.get("/:orderId/messages", authMiddleware, getMessagesHandler);

/**
 * @openapi
 * /chats/{orderId}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Envía un mensaje (solo si el pedido está RESERVED)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Mensaje enviado
 *       403:
 *         description: Sin acceso
 *       404:
 *         description: Pedido no encontrado
 *       409:
 *         description: El pedido no está en estado RESERVED
 */
router.post(
  "/:orderId/messages",
  authMiddleware,
  body("content").notEmpty().withMessage("content es requerido"),
  validate,
  sendMessageHandler
);

export default router;
