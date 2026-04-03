// auth.controller.js
// Controladores de autenticación - implementar según necesidad

const register = async (req, res) => {
  try {
    // TODO: implementar registro
    res.status(501).json({ success: false, message: "Not implemented yet" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    // TODO: implementar login
    res.status(501).json({ success: false, message: "Not implemented yet" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const me = async (req, res) => {
  try {
    // TODO: retornar usuario autenticado (req.user viene de authMiddleware)
    res.status(501).json({ success: false, message: "Not implemented yet" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { register, login, me };
