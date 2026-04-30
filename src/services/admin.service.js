import { User } from "#models/user.model.js";
import { Address } from "#models/address.model.js";

const listUsers = async ({ role, search, page = 1, limit = 20 }) => {
  const query = {};

  if (role) query.role = role;

  if (search) {
    const regex = new RegExp(search, "i");
    query.$or = [{ first_name: regex }, { last_name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ created_at: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  const usersWithAddress = await Promise.all(
    users.map(async (user) => {
      const [selectedAddress, addressCount] = await Promise.all([
        Address.findOne({ user_id: user._id, is_selected: true }),
        Address.countDocuments({ user_id: user._id }),
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
        selected_address: selectedAddress
          ? {
              formatted_address: selectedAddress.formatted_address,
              lat: selectedAddress.lat,
              lng: selectedAddress.lng,
            }
          : null,
        created_at: user.created_at,
        deleted_at: user.deleted_at,
      };

      if (user.role === "COMERCIO") {
        profile.business_name = user.business_name;
        profile.cuit = user.cuit;
      }

      return profile;
    })
  );

  return {
    users: usersWithAddress,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / Number(limit)),
    },
  };
};

export { listUsers };
