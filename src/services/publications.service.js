import { Publication } from "#models/publication.model.js";
import { Category } from "#models/category.model.js";
import { User } from "#models/user.model.js";
import { Address } from "#models/address.model.js";

// Fórmula Haversine para distancia en km entre dos coordenadas
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const buildCommerceData = (commerce, address) => ({
  id: commerce._id,
  business_name: commerce.business_name,
  selected_address: address
    ? { formatted_address: address.formatted_address, lat: address.lat, lng: address.lng }
    : null,
});

const buildPublicationResponse = (pub, commerce, address, distanceKm) => {
  const obj = {
    id: pub._id,
    title: pub.title,
    description: pub.description,
    original_price: pub.original_price,
    final_price: pub.final_price,
    discount_pct: pub.discount_pct,
    expiry_date: pub.expiry_date,
    category: pub.category_id
      ? { id: pub.category_id._id ?? pub.category_id, name: pub.category_id.name ?? undefined }
      : null,
    photos: pub.photos,
    status: pub.status,
    is_donation: pub.is_donation,
    commerce: buildCommerceData(commerce, address),
    created_at: pub.created_at,
  };
  if (distanceKm !== undefined) obj.distance_km = distanceKm;
  return obj;
};

const resolveCommerceAndAddress = async (commerceId) => {
  const [commerce, address] = await Promise.all([
    User.findById(commerceId),
    Address.findOne({ user_id: commerceId, is_selected: true }),
  ]);
  return { commerce, address };
};

const createPublication = async (commerceId, data) => {
  const { title, description, original_price, final_price, expiry_date, category_id, photos } =
    data;

  const category = await Category.findById(category_id);
  if (!category) {
    const err = new Error("Categoría no encontrada");
    err.status = 404;
    throw err;
  }

  const is_donation = original_price === final_price;
  const pub = await Publication.create({
    commerce_id: commerceId,
    title,
    description,
    original_price,
    final_price,
    expiry_date,
    category_id,
    photos: photos ?? [],
    is_donation,
  });

  const { commerce, address } = await resolveCommerceAndAddress(commerceId);
  const populated = await Publication.findById(pub._id);
  return buildPublicationResponse(
    { ...populated.toObject(), discount_pct: populated.discount_pct, category_id: category },
    commerce,
    address
  );
};

const listPublications = async (query) => {
  const {
    category_id,
    min_discount,
    max_price,
    sort_by = "created_at",
    sort_order = "desc",
    lat,
    lng,
    radius_km,
    donation,
    search,
    page = 1,
    limit = 20,
  } = query;

  const filter = { status: "ACTIVE" };
  if (category_id) filter.category_id = category_id;
  if (max_price !== undefined) filter.final_price = { $lte: Number(max_price) };
  if (donation === "true" || donation === true) filter.is_donation = true;
  if (search)
    filter.$or = [{ title: new RegExp(search, "i") }, { description: new RegExp(search, "i") }];

  let publications = await Publication.find(filter).populate("category_id", "name");

  // Filtro por descuento mínimo (virtual — se hace en JS)
  if (min_discount !== undefined) {
    publications = publications.filter((p) => p.discount_pct >= Number(min_discount));
  }

  // Obtener direcciones de los comercios involucrados
  const commerceIds = [...new Set(publications.map((p) => p.commerce_id))];
  const [commerces, addresses] = await Promise.all([
    User.find({ _id: { $in: commerceIds } }),
    Address.find({ user_id: { $in: commerceIds }, is_selected: true }),
  ]);
  const commerceMap = Object.fromEntries(commerces.map((c) => [c._id, c]));
  const addressMap = Object.fromEntries(addresses.map((a) => [a.user_id, a]));

  // Armar respuesta con distance_km
  const userLat = lat !== undefined ? Number(lat) : null;
  const userLng = lng !== undefined ? Number(lng) : null;

  let results = publications.map((pub) => {
    const commerce = commerceMap[pub.commerce_id];
    const address = addressMap[pub.commerce_id];
    let distanceKm;
    if (userLat !== null && userLng !== null && address) {
      distanceKm = Math.round(haversineKm(userLat, userLng, address.lat, address.lng) * 10) / 10;
    }
    return buildPublicationResponse(pub, commerce, address, distanceKm);
  });

  // Filtro por radio
  if (radius_km !== undefined && userLat !== null && userLng !== null) {
    results = results.filter(
      (r) => r.distance_km !== undefined && r.distance_km <= Number(radius_km)
    );
  }

  // Ordenamiento
  const order = sort_order === "asc" ? 1 : -1;
  const sortMap = {
    created_at: (a, b) => order * (new Date(a.created_at) - new Date(b.created_at)),
    final_price: (a, b) => order * (a.final_price - b.final_price),
    expiry_date: (a, b) => order * (new Date(a.expiry_date) - new Date(b.expiry_date)),
    discount_pct: (a, b) => order * (a.discount_pct - b.discount_pct),
    distance: (a, b) => order * ((a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)),
  };
  if (sortMap[sort_by]) results.sort(sortMap[sort_by]);

  const total = results.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return {
    publications: paginated,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      total_pages: Math.ceil(total / limitNum),
    },
  };
};

const getPublicationById = async (id) => {
  const pub = await Publication.findById(id).populate("category_id", "name");
  if (!pub) {
    const err = new Error("Publicación no encontrada");
    err.status = 404;
    throw err;
  }
  const { commerce, address } = await resolveCommerceAndAddress(pub.commerce_id);
  return buildPublicationResponse(pub, commerce, address);
};

const updatePublication = async (id, commerceId, data) => {
  const pub = await Publication.findById(id);
  if (!pub) {
    const err = new Error("Publicación no encontrada");
    err.status = 404;
    throw err;
  }
  if (pub.commerce_id !== commerceId) {
    const err = new Error("No tenés permisos para editar esta publicación");
    err.status = 403;
    throw err;
  }
  if (pub.status !== "ACTIVE") {
    const err = new Error("Solo se pueden editar publicaciones activas");
    err.status = 409;
    throw err;
  }

  const allowed = [
    "title",
    "description",
    "original_price",
    "final_price",
    "expiry_date",
    "category_id",
    "photos",
  ];
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }

  if (update.category_id) {
    const category = await Category.findById(update.category_id);
    if (!category) {
      const err = new Error("Categoría no encontrada");
      err.status = 404;
      throw err;
    }
  }

  const newOriginal = update.original_price ?? pub.original_price;
  const newFinal = update.final_price ?? pub.final_price;
  update.is_donation = newOriginal === newFinal;

  await Publication.findByIdAndUpdate(id, update, { runValidators: true });
  return getPublicationById(id);
};

const deletePublication = async (id, commerceId) => {
  const pub = await Publication.findById(id);
  if (!pub) {
    const err = new Error("Publicación no encontrada");
    err.status = 404;
    throw err;
  }
  if (pub.commerce_id !== commerceId) {
    const err = new Error("No tenés permisos para eliminar esta publicación");
    err.status = 403;
    throw err;
  }
  if (pub.status !== "ACTIVE") {
    const err = new Error("Solo se pueden dar de baja publicaciones activas");
    err.status = 409;
    throw err;
  }
  await Publication.findByIdAndUpdate(id, { status: "CANCELLED" });
  await pub.softDelete();
};

const getMyPublications = async (commerceId, query) => {
  const { status, page = 1, limit = 20 } = query;

  const filter = { commerce_id: commerceId };
  if (status) filter.status = status;

  const [publications, total] = await Promise.all([
    Publication.findWithDeleted(filter)
      .populate("category_id", "name")
      .sort({ created_at: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Publication.countDocuments(filter).setOptions({ withDeleted: true }),
  ]);

  const { commerce, address } = await resolveCommerceAndAddress(commerceId);
  const results = publications.map((pub) => buildPublicationResponse(pub, commerce, address));

  return {
    publications: results,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / Number(limit)),
    },
  };
};

const listAllPublications = async (query) => {
  const { status, commerce_id, category_id, page = 1, limit = 20 } = query;

  const filter = {};
  if (status) filter.status = status;
  if (commerce_id) filter.commerce_id = commerce_id;
  if (category_id) filter.category_id = category_id;

  const [publications, total] = await Promise.all([
    Publication.findWithDeleted(filter)
      .populate("category_id", "name")
      .sort({ created_at: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Publication.countDocuments(filter).setOptions({ withDeleted: true }),
  ]);

  const commerceIds = [...new Set(publications.map((p) => p.commerce_id))];
  const [commerces, addresses] = await Promise.all([
    User.find({ _id: { $in: commerceIds } }),
    Address.find({ user_id: { $in: commerceIds }, is_selected: true }),
  ]);
  const commerceMap = Object.fromEntries(commerces.map((c) => [c._id, c]));
  const addressMap = Object.fromEntries(addresses.map((a) => [a.user_id, a]));

  const results = publications.map((pub) =>
    buildPublicationResponse(pub, commerceMap[pub.commerce_id], addressMap[pub.commerce_id])
  );

  return {
    publications: results,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / Number(limit)),
    },
  };
};

export {
  createPublication,
  listPublications,
  getPublicationById,
  updatePublication,
  deletePublication,
  getMyPublications,
  listAllPublications,
};
