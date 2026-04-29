import { listNotifications } from "#services/notification.service.js";

const getNotifications = async (req, res, next) => {
  try {
    const result = await listNotifications(req.user.id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export { getNotifications };
