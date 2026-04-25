import { Router } from "express";
import {
  searchAddresses,
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  selectAddress,
} from "#controllers/addresses.controller.js";
import authMiddleware from "#middlewares/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /addresses/search:
 *   get:
 *     tags: [Addresses]
 *     summary: Busca direcciones por texto via geocoding
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Texto de búsqueda (ej. "Corrientes 1234")
 *     responses:
 *       200:
 *         description: Lista de resultados geocodificados
 *       400:
 *         description: Parámetro q requerido
 */
router.get("/search", authMiddleware, searchAddresses);

/**
 * @openapi
 * /addresses:
 *   get:
 *     tags: [Addresses]
 *     summary: Lista las direcciones del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de direcciones ordenadas (seleccionada primero)
 */
router.get("/", authMiddleware, getMyAddresses);

/**
 * @openapi
 * /addresses:
 *   post:
 *     tags: [Addresses]
 *     summary: Crea una nueva dirección
 *     description: Comercio solo puede tener una dirección. La primera dirección del consumidor queda seleccionada.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [formatted_address, street, number, city, province, lat, lng]
 *             properties:
 *               formatted_address:
 *                 type: string
 *               street:
 *                 type: string
 *               number:
 *                 type: string
 *               city:
 *                 type: string
 *               province:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *     responses:
 *       201:
 *         description: Dirección creada
 *       409:
 *         description: El comercio ya tiene una dirección registrada
 */
router.post("/", authMiddleware, createAddress);

/**
 * @openapi
 * /addresses/{id}:
 *   put:
 *     tags: [Addresses]
 *     summary: Actualiza una dirección propia
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
 *               formatted_address:
 *                 type: string
 *               street:
 *                 type: string
 *               number:
 *                 type: string
 *               city:
 *                 type: string
 *               province:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *     responses:
 *       200:
 *         description: Dirección actualizada
 *       404:
 *         description: Dirección no encontrada
 */
router.put("/:id", authMiddleware, updateAddress);

/**
 * @openapi
 * /addresses/{id}:
 *   delete:
 *     tags: [Addresses]
 *     summary: Elimina una dirección (soft delete)
 *     description: No se puede eliminar si es la única o si está seleccionada.
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
 *         description: Dirección eliminada
 *       400:
 *         description: No se puede eliminar la única o la seleccionada
 *       404:
 *         description: Dirección no encontrada
 */
router.delete("/:id", authMiddleware, deleteAddress);

/**
 * @openapi
 * /addresses/{id}/select:
 *   put:
 *     tags: [Addresses]
 *     summary: Marca una dirección como seleccionada/activa
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
 *         description: Dirección seleccionada
 *       404:
 *         description: Dirección no encontrada
 */
router.put("/:id/select", authMiddleware, selectAddress);

export default router;
