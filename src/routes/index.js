import { Router } from "express";

import healthRouter from "#routes/health.route.js";
import authRouter from "#routes/auth.route.js";
import usersRouter from "#routes/users.route.js";
import addressesRouter from "#routes/addresses.route.js";
import categoriesRouter from "#routes/categories.route.js";
import uploadsRouter from "#routes/uploads.route.js";
import adminRouter from "#routes/admin.route.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/addresses", addressesRouter);
router.use("/categories", categoriesRouter);
router.use("/uploads", uploadsRouter);
router.use("/admin", adminRouter);

export default router;
