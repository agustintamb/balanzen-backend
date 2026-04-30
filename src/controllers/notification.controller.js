import { listNotifications, markAsRead, markAllAsRead } from "#services/notification.service.js";

const getNotifications = async (req, res, next) => {
  try {
    const result = await listNotifications(req.user.id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const result = await markAsRead(req.params.id, req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await markAllAsRead(req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export { getNotifications, markNotificationAsRead, markAllNotificationsAsRead };
