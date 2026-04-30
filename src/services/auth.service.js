import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import envConfig from "#config/env.config.js";
import { User } from "#models/user.model.js";
import { Address } from "#models/address.model.js";
import { generateId } from "#utils/uuid.helper.js";

const { jwt: jwtConfig } = envConfig;

const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
};

const generateRefreshToken = (payload) => {
  return jwt.sign({ ...payload, jti: generateId() }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const register = async (body) => {
  const {
    role,
    first_name,
    last_name,
    email,
    password,
    confirm_password,
    phone,
    dni,
    business_name,
    cuit,
    description,
    address,
  } = body;

  if (!["CONSUMIDOR", "COMERCIO"].includes(role)) {
    const err = new Error("Rol inválido");
    err.status = 400;
    throw err;
  }

  if (password !== confirm_password) {
    const err = new Error("Las contraseñas no coinciden");
    err.status = 400;
    throw err;
  }

  if (role === "COMERCIO" && (!business_name || !cuit || !address)) {
    const err = new Error("business_name, cuit y address son requeridos para COMERCIO");
    err.status = 400;
    throw err;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("El email ya está registrado");
    err.status = 409;
    throw err;
  }

  const hashedPassword = await hashPassword(password);

  const userData = { email, password: hashedPassword, role, first_name, last_name, phone, dni };
  if (role === "COMERCIO") {
    userData.business_name = business_name;
    userData.cuit = cuit;
    if (description) userData.description = description;
  }

  const user = await User.create(userData);

  if (role === "COMERCIO") {
    try {
      await Address.create({ user_id: user._id, ...address, is_selected: true });
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      throw err;
    }
  }

  const tokenPayload = { id: user._id, role: user.role };
  const access_token = generateToken(tokenPayload);
  const refresh_token = generateRefreshToken({ id: user._id });

  user.refresh_token = refresh_token;
  await user.save();

  const response = {
    id: user._id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    access_token,
    refresh_token,
  };
  if (role === "COMERCIO") response.business_name = user.business_name;

  return response;
};

const login = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("Credenciales inválidas");
    err.status = 401;
    throw err;
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    const err = new Error("Credenciales inválidas");
    err.status = 401;
    throw err;
  }

  const hasAddress = (await Address.countDocuments({ user_id: user._id })) > 0;

  const tokenPayload = { id: user._id, role: user.role };
  const access_token = generateToken(tokenPayload);
  const refresh_token = generateRefreshToken({ id: user._id });

  user.refresh_token = refresh_token;
  await user.save();

  return {
    access_token,
    refresh_token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      photo_url: user.photo_url,
      has_address: hasAddress,
    },
  };
};

const refresh = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, jwtConfig.refreshSecret);
  } catch {
    const err = new Error("Refresh token inválido o expirado");
    err.status = 401;
    throw err;
  }

  const user = await User.findById(decoded.id);
  if (!user || user.refresh_token !== token) {
    const err = new Error("Refresh token inválido");
    err.status = 401;
    throw err;
  }

  const access_token = generateToken({ id: user._id, role: user.role });
  return { access_token };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refresh_token: null });
};

const changePassword = async (userId, { current_password, new_password, confirm_password }) => {
  if (new_password !== confirm_password) {
    const err = new Error("Las contraseñas no coinciden");
    err.status = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  const isValid = await comparePassword(current_password, user.password);
  if (!isValid) {
    const err = new Error("Contraseña actual incorrecta");
    err.status = 401;
    throw err;
  }

  const hashed = await hashPassword(new_password);
  await User.findByIdAndUpdate(userId, { password: hashed });
};

export {
  generateToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  register,
  login,
  refresh,
  logout,
  changePassword,
};
