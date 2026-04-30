import { getCommerceSummary } from "#services/metrics.service.js";

const getSummary = async (req, res, next) => {
  try {
    const result = await getCommerceSummary(req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export { getSummary };
