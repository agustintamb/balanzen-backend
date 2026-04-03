/**
 * Middleware de control de acceso por roles.
 * Debe usarse DESPUÉS de authMiddleware.
 *
 * Uso: router.get('/admin', authMiddleware, roleMiddleware(['admin']), controller)
 */
const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "No autenticado",
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "No tenés permisos para acceder a este recurso",
      });
    }

    next();
  };
};

export default roleMiddleware;
