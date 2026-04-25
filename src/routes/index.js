import { Router } from "express";

import healthRouter from "#routes/health.route.js";
import authRouter from "#routes/auth.route.js";
import usersRouter from "#routes/users.route.js";
import addressesRouter from "#routes/addresses.route.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/addresses", addressesRouter);

export default router;
