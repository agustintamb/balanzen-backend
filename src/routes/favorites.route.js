import { Router } from "express";
import authMiddleware from "#middlewares/auth.middleware.js";
import roleMiddleware from "#middlewares/role.middleware.js";
import {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
} from "#controllers/favorites.controller.js";

const router = Router();

router.use(authMiddleware, roleMiddleware(["CONSUMIDOR"]));

/**
 * @openapi
 * /favorites/{publicationId}:
 *   post:
 *     tags: [Favorites]
 *     summary: Agrega una publicación a favoritos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Agregado a favoritos
 *       404:
 *         description: Publicación no encontrada
 *       409:
 *         description: La publicación ya está en favoritos
 */
router.post("/:publicationId", addToFavorites);

/**
 * @openapi
 * /favorites/{publicationId}:
 *   delete:
 *     tags: [Favorites]
 *     summary: Quita una publicación de favoritos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Eliminado de favoritos
 *       404:
 *         description: Favorito no encontrado
 */
router.delete("/:publicationId", removeFromFavorites);

/**
 * @openapi
 * /favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: Lista las publicaciones favoritas del consumidor autenticado
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Lista paginada de favoritos con datos de publicación populados
 */
router.get("/", getFavorites);

export default router;
