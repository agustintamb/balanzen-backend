import { Notification } from "#models/notification.model.js";
import { getIO } from "#config/socket.config.js";

const createNotification = async ({ userId, type, title, message, referenceId, referenceType }) => {
  const notification = await Notification.create({
    user_id: userId,
    type,
    title,
    message,
    reference_id: referenceId ?? null,
    reference_type: referenceType ?? null,
  });

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("new_notification", {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      reference_id: notification.reference_id,
      reference_type: notification.reference_type,
      created_at: notification.created_at,
    });
  } catch {
    // io no disponible en tests o fuera de contexto HTTP
  }

  return notification;
};

const listNotifications = async (userId, query) => {
  const { read, page = 1, limit = 20 } = query;

  const filter = { user_id: userId };
  if (read === "true") filter.read = true;
  if (read === "false") filter.read = false;

  const [notifications, total, unread_count] = await Promise.all([
    Notification.find(filter)
      .sort({ created_at: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user_id: userId, read: false }),
  ]);

  return {
    unread_count,
    notifications: notifications.map((n) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      reference_id: n.reference_id,
      reference_type: n.reference_type,
      read: n.read,
      created_at: n.created_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / Number(limit)),
    },
  };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    const err = new Error("Notificación no encontrada");
    err.status = 404;
    throw err;
  }

  if (notification.user_id !== userId) {
    const err = new Error("No tenés permiso para modificar esta notificación");
    err.status = 403;
    throw err;
  }

  notification.read = true;
  await notification.save();
  return { message: "Notificación marcada como leída" };
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany({ user_id: userId, read: false }, { read: true });
  return {
    message: "Notificaciones marcadas como leídas",
    updated: result.modifiedCount,
  };
};

export { createNotification, listNotifications, markAsRead, markAllAsRead };