import { User } from "#models/user.model.js";
import { Address } from "#models/address.model.js";

const EDITABLE_CONSUMIDOR = ["first_name", "last_name", "email", "phone", "photo_url"];
const EDITABLE_COMERCIO = [...EDITABLE_CONSUMIDOR, "business_name", "description"];

const buildAddressResponse = (addr) => ({
  id: addr._id,
  formatted_address: addr.formatted_address,
  street: addr.street,
  number: addr.number,
  city: addr.city,
  province: addr.province,
  lat: addr.lat,
  lng: addr.lng,
});

const getMyProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  const [selectedAddress, addressCount] = await Promise.all([
    Address.findOne({ user_id: userId, is_selected: true }),
    Address.countDocuments({ user_id: userId }),
  ]);

  const profile = {
    id: user._id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    dni: user.dni,
    photo_url: user.photo_url,
    has_address: addressCount > 0,
    selected_address: selectedAddress ? buildAddressResponse(selectedAddress) : null,
    created_at: user.created_at,
  };

  if (user.role === "COMERCIO") {
    profile.business_name = user.business_name;
    profile.cuit = user.cuit;
    profile.description = user.description;
  }

  return profile;
};

const updateMyProfile = async (userId, role, data) => {
  const allowed = role === "COMERCIO" ? EDITABLE_COMERCIO : EDITABLE_CONSUMIDOR;
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }

  if (Object.keys(update).length === 0) {
    const err = new Error("No hay campos válidos para actualizar");
    err.status = 400;
    throw err;
  }

  if (update.email) {
    const existing = await User.findOne({ email: update.email });
    if (existing && existing._id !== userId) {
      const err = new Error("El email ya está en uso");
      err.status = 409;
      throw err;
    }
  }

  await User.findByIdAndUpdate(userId, update, { runValidators: true });
  return getMyProfile(userId);
};

const getAdminUserProfile = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    const err = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  const addresses = await Address.find({ user_id: id });

  const profile = {
    id: user._id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    dni: user.dni,
    photo_url: user.photo_url,
    addresses: addresses.map((a) => ({
      id: a._id,
      formatted_address: a.formatted_address,
      is_selected: a.is_selected,
    })),
    created_at: user.created_at,
    deleted_at: user.deleted_at,
  };

  if (user.role === "COMERCIO") {
    profile.business_name = user.business_name;
    profile.cuit = user.cuit;
    profile.description = user.description;
  }

  return profile;
};

const getPublicProfile = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    const err = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  const profile = {
    id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    photo_url: user.photo_url,
  };

  if (user.role === "COMERCIO") {
    profile.business_name = user.business_name;
    const selectedAddress = await Address.findOne({ user_id: id, is_selected: true });
    profile.selected_address = selectedAddress
      ? {
          formatted_address: selectedAddress.formatted_address,
          lat: selectedAddress.lat,
          lng: selectedAddress.lng,
        }
      : null;
  }

  return profile;
};

export { getMyProfile, updateMyProfile, getAdminUserProfile, getPublicProfile };
