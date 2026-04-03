// auth.service.js
// Lógica de negocio de autenticación

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import envConfig from "../config/env.config.js";

const { jwt: jwtConfig } = envConfig;

/**
 * Genera un JWT para el usuario dado
 */
const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
};

/**
 * Hashea una contraseña
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compara una contraseña con su hash
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export { generateToken, hashPassword, comparePassword };
