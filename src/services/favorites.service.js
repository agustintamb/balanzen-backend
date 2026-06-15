import { Favorite } from "#models/favorite.model.js";
import { Publication } from "#models/publication.model.js";
import { User } from "#models/user.model.js";
import { Address } from "#models/address.model.js";

const addFavorite = async (userId, publicationId) => {
  const pub = await Publication.findById(publicationId);
  if (!pub) {
    const err = new Error("Publicación no encontrada");
    err.status = 404;
    throw err;
  }

  const existing = await Favorite.findOne({
    user_id: userId,
    publication_id: publicationId,
  }).setOptions({ withDeleted: true });

  if (existing && !existing.deleted_at) {
    const err = new Error("La publicación ya está en favoritos");
    err.status = 409;
    throw err;
  }

  if (existing) {
    existing.deleted_at = null;
    existing.created_at = new Date();
    await existing.save();
    return { message: "Agregado a favoritos" };
  }

  await Favorite.create({ user_id: userId, publication_id: publicationId });
  return { message: "Agregado a favoritos" };
};

const removeFavorite = async (userId, publicationId) => {
  const favorite = await Favorite.findOne({ user_id: userId, publication_id: publicationId });
  if (!favorite) {
    const err = new Error("Favorito no encontrado");
    err.status = 404;
    throw err;
  }

  await favorite.softDelete();
  return { message: "Eliminado de favoritos" };
};

const listFavorites = async (userId, query) => {
  const { page = 1, limit = 20 } = query;

  const [favorites, total] = await Promise.all([
    Favorite.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Favorite.countDocuments({ user_id: userId }),
  ]);

  const favoritesWithData = await Promise.all(
    favorites.map(async (fav) => {
      const pub = await Publication.findById(fav.publication_id);
      if (!pub) return null;

      const [commerce, address] = await Promise.all([
        User.findById(pub.commerce_id),
        Address.findOne({ user_id: pub.commerce_id, is_selected: true }),
      ]);

      return {
        id: fav._id,
        publication: {
          id: pub._id,
          title: pub.title,
          original_price: pub.original_price,
          final_price: pub.final_price,
          discount_pct: pub.discount_pct,
          photos: pub.photos,
          status: pub.status,
          commerce: commerce
            ? {
                business_name: commerce.business_name,
                selected_address: address ? { formatted_address: address.formatted_address } : null,
              }
            : null,
        },
        created_at: fav.created_at,
      };
    })
  );

  return {
    favorites: favoritesWithData.filter(Boolean),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / Number(limit)),
    },
  };
};

export { addFavorite, removeFavorite, listFavorites };
