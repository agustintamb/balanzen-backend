import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import roleMiddleware from "#middlewares/role.middleware.js";
import {
  createPublicationHandler,
  listPublicationsHandler,
  getPublicationHandler,
  updatePublicationHandler,
  deletePublicationHandler,
  getMyPublicationsHandler,
} from "#controllers/publications.controller.js";

const router = Router();

/**
 * @openapi
 * /publications/me:
 *   get:
 *     tags: [Publications]
 *     summary: Mis publicaciones (COMERCIO)
 *     description: Lista todas las publicaciones del comercio autenticado en todos los estados.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, RESERVED, DELIVERED, CANCELLED, EXPIRED]
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
 *         description: Lista de publicaciones propias
 */
router.get("/me", authMiddleware, roleMiddleware(["COMERCIO"]), getMyPublicationsHandler);

/**
 * @openapi
 * /publications:
 *   post:
 *     tags: [Publications]
 *     summary: Crea una publicación (COMERCIO)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, original_price, final_price, expiry_date, category_id]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               original_price:
 *                 type: number
 *               final_price:
 *                 type: number
 *               expiry_date:
 *                 type: string
 *                 format: date-time
 *               category_id:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Publicación creada
 *       404:
 *         description: Categoría no encontrada
 */
router.post("/", authMiddleware, roleMiddleware(["COMERCIO"]), createPublicationHandler);

/**
 * @openapi
 * /publications:
 *   get:
 *     tags: [Publications]
 *     summary: Lista publicaciones activas con filtros (CONSUMIDOR)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: min_discount
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, discount_pct, expiry_date, final_price, distance]
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius_km
 *         schema:
 *           type: number
 *       - in: query
 *         name: donation
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
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
 *         description: Lista de publicaciones activas con paginación
 */
router.get("/", authMiddleware, roleMiddleware(["CONSUMIDOR"]), listPublicationsHandler);

/**
 * @openapi
 * /publications/{id}:
 *   get:
 *     tags: [Publications]
 *     summary: Detalle de una publicación
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
 *         description: Detalle de la publicación
 *       404:
 *         description: Publicación no encontrada
 */
router.get("/:id", authMiddleware, getPublicationHandler);

/**
 * @openapi
 * /publications/{id}:
 *   put:
 *     tags: [Publications]
 *     summary: Edita una publicación (solo si ACTIVE, solo owner)
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               original_price:
 *                 type: number
 *               final_price:
 *                 type: number
 *               expiry_date:
 *                 type: string
 *                 format: date-time
 *               category_id:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Publicación actualizada
 *       403:
 *         description: No es owner
 *       404:
 *         description: Publicación no encontrada
 *       409:
 *         description: La publicación no está activa
 */
router.put("/:id", authMiddleware, roleMiddleware(["COMERCIO"]), updatePublicationHandler);

/**
 * @openapi
 * /publications/{id}:
 *   delete:
 *     tags: [Publications]
 *     summary: Da de baja una publicación (ACTIVE → CANCELLED, soft delete)
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
 *         description: Publicación dada de baja
 *       403:
 *         description: No es owner
 *       404:
 *         description: Publicación no encontrada
 *       409:
 *         description: La publicación no está activa
 */
router.delete("/:id", authMiddleware, roleMiddleware(["COMERCIO"]), deletePublicationHandler);

export default router;
