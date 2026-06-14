import { register, generateToken, hashPassword } from "#services/auth.service.js";
import { User } from "#models/user.model.js";
import { COMERCIO_DATA, CONSUMIDOR_DATA } from "#tests/helpers/fixtures.helper.js";

// Registra un CONSUMIDOR y devuelve su id + tokens listos para usar en el header
export const authConsumer = async (overrides = {}) => {
  const data = await register({ ...CONSUMIDOR_DATA, ...overrides });
  return { id: data.id, token: data.access_token, refresh_token: data.refresh_token };
};

// Registra un COMERCIO y devuelve su id + tokens
export const authCommerce = async (overrides = {}) => {
  const data = await register({ ...COMERCIO_DATA, ...overrides });
  return { id: data.id, token: data.access_token, refresh_token: data.refresh_token };
};

// Crea un ADMIN directo en la DB (no hay registro de ADMIN por API) y firma su token
export const authAdmin = async () => {
  const password = await hashPassword("Admin123");
  const user = await User.create({
    email: "admin@test.com",
    password,
    role: "ADMIN",
    first_name: "Admin",
    last_name: "Test",
    phone: "1100000000",
    dni: "99999999",
  });
  const token = generateToken({ id: user._id, role: user.role });
  return { id: user._id, token };
};

export const bearer = (token) => `Bearer ${token}`;
