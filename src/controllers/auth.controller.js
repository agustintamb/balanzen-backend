import {
  register as registerService,
  login as loginService,
  refresh as refreshService,
  logout as logoutService,
} from "#services/auth.service.js";

const register = async (req, res, next) => {
  try {
    const data = await registerService(req.body);
    res.status(201).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await loginService(email, password);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ success: false, message: "refresh_token requerido" });
    }
    const data = await refreshService(refresh_token);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await logoutService(req.user.id);
    res.status(200).json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (err) {
    next(err);
  }
};

export { register, login, refresh, logout };
