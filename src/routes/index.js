import { Router } from "express";

import healthRouter from "#routes/health.route.js";
import authRouter from "#routes/auth.route.js";
import usersRouter from "#routes/users.route.js";
import addressesRouter from "#routes/addresses.route.js";
import categoriesRouter from "#routes/categories.route.js";
import publicationsRouter from "#routes/publications.route.js";
import ordersRouter from "#routes/orders.route.js";
import chatRouter from "#routes/chat.route.js";
import notificationRouter from "#routes/notification.route.js";
import uploadsRouter from "#routes/uploads.route.js";
import adminRouter from "#routes/admin.route.js";
import favoritesRouter from "#routes/favorites.route.js";
import metricsRouter from "#routes/metrics.route.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/addresses", addressesRouter);
router.use("/categories", categoriesRouter);
router.use("/publications", publicationsRouter);
router.use("/orders", ordersRouter);
router.use("/chats", chatRouter);
router.use("/notifications", notificationRouter);
router.use("/uploads", uploadsRouter);
router.use("/admin", adminRouter);
router.use("/favorites", favoritesRouter);
router.use("/metrics", metricsRouter);

export default router;
