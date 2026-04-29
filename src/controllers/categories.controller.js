import { listCategories } from "#services/categories.service.js";

const getCategories = async (req, res, next) => {
  try {
    const categories = await listCategories();
    res.status(200).json({ success: true, categories });
  } catch (err) {
    next(err);
  }
};

export { getCategories };
