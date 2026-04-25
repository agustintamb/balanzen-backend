import { getMyProfile, updateMyProfile } from "#services/users.service.js";

const getMe = async (req, res, next) => {
  try {
    const profile = await getMyProfile(req.user.id);
    res.status(200).json({ success: true, ...profile });
  } catch (err) {
    next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const profile = await updateMyProfile(req.user.id, req.user.role, req.body);
    res.status(200).json({ success: true, ...profile });
  } catch (err) {
    next(err);
  }
};

export { getMe, updateMe };
