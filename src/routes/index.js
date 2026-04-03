import { Router } from "express";

import healthRouter from "./health.route.js";
import authRouter from "./auth.route.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);

// Agregar nuevas rutas acá
// router.use("/users", usersRouter);

export default router;
