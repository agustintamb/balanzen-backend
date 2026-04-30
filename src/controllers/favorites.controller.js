import { addFavorite, removeFavorite, listFavorites } from "#services/favorites.service.js";

const addToFavorites = async (req, res, next) => {
  try {
    const result = await addFavorite(req.user.id, req.params.publicationId);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const removeFromFavorites = async (req, res, next) => {
  try {
    const result = await removeFavorite(req.user.id, req.params.publicationId);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getFavorites = async (req, res, next) => {
  try {
    const result = await listFavorites(req.user.id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export { addToFavorites, removeFromFavorites, getFavorites };
