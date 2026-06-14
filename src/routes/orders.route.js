import { Router } from "express";
import { body } from "express-validator";
import dateRangeValidators from "#middlewares/date-range.validator.js";
import authMiddleware from "#middlewares/auth.middleware.js";
import roleMiddleware from "#middlewares/role.middleware.js";
import validate from "#middlewares/validate.middleware.js";
import {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
  cancelOrderHandler,
  deliverOrderHandler,
} from "#controllers/orders.controller.js";

const router = Router();

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Crea una reserva (CONSUMIDOR)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [publication_id]
 *             properties:
 *               publication_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reserva creada
 *       404:
 *         description: Publicación no encontrada
 *       409:
 *         description: Publicación no disponible o ya tiene reserva activa
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["CONSUMIDOR"]),
  body("publication_id").notEmpty().withMessage("publication_id es requerido"),
  validate,
  createOrderHandler
);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: Lista pedidos del usuario autenticado
 *     description: |
 *       Consumidor ve sus reservas con datos de publicación y comercio.
 *       Comercio ve las reservas recibidas con datos de publicación y consumidor.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [RESERVED, DELIVERED, CANCELLED]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar pedidos con created_at >= date_from (ISO 8601)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar pedidos con created_at <= date_to (ISO 8601)
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
 *         description: Lista paginada de pedidos
 *       400:
 *         description: Parámetros de fecha inválidos
 */
router.get("/", authMiddleware, ...dateRangeValidators, validate, listOrdersHandler);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Detalle de un pedido
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
 *         description: Detalle del pedido
 *       403:
 *         description: Sin acceso
 *       404:
 *         description: Pedido no encontrado
 */
router.get("/:id", authMiddleware, getOrderHandler);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   put:
 *     tags: [Orders]
 *     summary: Cancela un pedido (ambas partes)
 *     description: La publicación vuelve a ACTIVE si no venció.
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
 *         description: Pedido cancelado
 *       403:
 *         description: Sin acceso
 *       404:
 *         description: Pedido no encontrado
 *       409:
 *         description: El pedido no está en estado RESERVED
 */
router.put("/:id/cancel", authMiddleware, cancelOrderHandler);

/**
 * @openapi
 * /orders/{id}/deliver:
 *   put:
 *     tags: [Orders]
 *     summary: Marca un pedido como entregado (COMERCIO)
 *     description: La publicación pasa a DELIVERED.
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
 *         description: Pedido marcado como entregado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Pedido no encontrado
 *       409:
 *         description: El pedido no está en estado RESERVED
 */
router.put("/:id/deliver", authMiddleware, roleMiddleware(["COMERCIO"]), deliverOrderHandler);

export default router;
