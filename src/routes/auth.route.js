import { Router } from "express";
import { register, login, refresh, logout } from "#controllers/auth.controller.js";
import authMiddleware from "#middlewares/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un nuevo usuario
 *     description: |
 *       Crea un usuario CONSUMIDOR o COMERCIO.
 *       Para COMERCIO se requieren business_name, cuit y address.
 *       El address del comercio se crea en el mismo request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, first_name, last_name, email, password, confirm_password, phone, dni]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [CONSUMIDOR, COMERCIO]
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               confirm_password:
 *                 type: string
 *               phone:
 *                 type: string
 *               dni:
 *                 type: string
 *               business_name:
 *                 type: string
 *                 description: Requerido para COMERCIO
 *               cuit:
 *                 type: string
 *                 description: Requerido para COMERCIO
 *               address:
 *                 type: object
 *                 description: Requerido para COMERCIO
 *                 properties:
 *                   formatted_address:
 *                     type: string
 *                   street:
 *                     type: string
 *                   number:
 *                     type: string
 *                   city:
 *                     type: string
 *                   province:
 *                     type: string
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos inválidos o contraseñas no coinciden
 *       409:
 *         description: El email ya está registrado
 */
router.post("/register", register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso. Retorna tokens y perfil básico con has_address
 *       401:
 *         description: Credenciales inválidas
 */
router.post("/login", login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renueva el access token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nuevo access token generado
 *       401:
 *         description: Refresh token inválido o expirado
 */
router.post("/refresh", authMiddleware, refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cierra sesión e invalida el refresh token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *       401:
 *         description: No autenticado
 */
router.post("/logout", authMiddleware, logout);

export default router;
