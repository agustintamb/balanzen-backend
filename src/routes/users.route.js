import { Router } from "express";
import { getMe, updateMe } from "#controllers/users.controller.js";
import authMiddleware from "#middlewares/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Perfil completo del usuario autenticado
 *     description: Retorna el perfil con selected_address populada y has_address.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       401:
 *         description: No autenticado
 */
router.get("/me", authMiddleware, getMe);

/**
 * @openapi
 * /users/me:
 *   put:
 *     tags: [Users]
 *     summary: Actualiza el perfil del usuario autenticado
 *     description: |
 *       Consumidor puede editar: first_name, last_name, email, phone, photo_url.
 *       Comercio puede editar además: business_name, description.
 *       La dirección se gestiona desde /addresses.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               photo_url:
 *                 type: string
 *               business_name:
 *                 type: string
 *                 description: Solo COMERCIO
 *               description:
 *                 type: string
 *                 description: Solo COMERCIO
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Sin campos válidos para actualizar
 *       409:
 *         description: El email ya está en uso
 */
router.put("/me", authMiddleware, updateMe);

export default router;
