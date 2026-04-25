import { Address } from "#models/address.model.js";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const mapNominatimResult = (result) => ({
  formatted_address: result.display_name,
  street: result.address?.road || result.address?.pedestrian || result.address?.path || "",
  number: result.address?.house_number || "",
  city:
    result.address?.city_district ||
    result.address?.suburb ||
    result.address?.city ||
    result.address?.town ||
    result.address?.village ||
    "",
  province: result.address?.state || "",
  lat: parseFloat(result.lat),
  lng: parseFloat(result.lon),
});

const searchAddresses = async (query) => {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "5",
    countrycodes: "ar",
  });

  const response = await globalThis.fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": "BalanZen/1.0 (balanzen.app)" },
  });

  if (!response.ok) {
    const err = new Error("Error al consultar el servicio de geocoding");
    err.status = 502;
    throw err;
  }

  const results = await response.json();
  return { results: results.map(mapNominatimResult) };
};

const getMyAddresses = async (userId) => {
  const addresses = await Address.find({ user_id: userId }).sort({
    is_selected: -1,
    created_at: 1,
  });
  return {
    addresses: addresses.map((a) => ({
      id: a._id,
      formatted_address: a.formatted_address,
      street: a.street,
      number: a.number,
      city: a.city,
      province: a.province,
      lat: a.lat,
      lng: a.lng,
      is_selected: a.is_selected,
    })),
  };
};

const createAddress = async (userId, role, data) => {
  if (role === "COMERCIO") {
    const existing = await Address.countDocuments({ user_id: userId });
    if (existing > 0) {
      const err = new Error("El comercio ya tiene una dirección registrada");
      err.status = 409;
      throw err;
    }
  }

  const addressCount = await Address.countDocuments({ user_id: userId });
  const isFirstAddress = addressCount === 0;

  const address = await Address.create({
    user_id: userId,
    ...data,
    is_selected: isFirstAddress || role === "COMERCIO",
  });

  return {
    id: address._id,
    formatted_address: address.formatted_address,
    street: address.street,
    number: address.number,
    city: address.city,
    province: address.province,
    lat: address.lat,
    lng: address.lng,
    is_selected: address.is_selected,
  };
};

const updateAddress = async (userId, addressId, data) => {
  const address = await Address.findOne({ _id: addressId, user_id: userId });
  if (!address) {
    const err = new Error("Dirección no encontrada");
    err.status = 404;
    throw err;
  }

  const EDITABLE = ["formatted_address", "street", "number", "city", "province", "lat", "lng"];
  const update = {};
  for (const key of EDITABLE) {
    if (data[key] !== undefined) update[key] = data[key];
  }

  Object.assign(address, update);
  await address.save();

  return {
    id: address._id,
    formatted_address: address.formatted_address,
    street: address.street,
    number: address.number,
    city: address.city,
    province: address.province,
    lat: address.lat,
    lng: address.lng,
    is_selected: address.is_selected,
  };
};

const deleteAddress = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, user_id: userId });
  if (!address) {
    const err = new Error("Dirección no encontrada");
    err.status = 404;
    throw err;
  }

  if (address.is_selected) {
    const err = new Error("No se puede eliminar la dirección seleccionada");
    err.status = 400;
    throw err;
  }

  const count = await Address.countDocuments({ user_id: userId });
  if (count <= 1) {
    const err = new Error("No se puede eliminar la única dirección");
    err.status = 400;
    throw err;
  }

  await address.softDelete();
};

const selectAddress = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, user_id: userId });
  if (!address) {
    const err = new Error("Dirección no encontrada");
    err.status = 404;
    throw err;
  }

  await Address.updateMany({ user_id: userId }, { is_selected: false });
  address.is_selected = true;
  await address.save();

  return {
    id: address._id,
    formatted_address: address.formatted_address,
    street: address.street,
    number: address.number,
    city: address.city,
    province: address.province,
    lat: address.lat,
    lng: address.lng,
    is_selected: true,
  };
};

export {
  searchAddresses,
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  selectAddress,
};
