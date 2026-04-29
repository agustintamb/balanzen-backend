import { createCategory, updateCategory, deleteCategory } from "#services/categories.service.js";

const adminCreateCategory = async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ success: true, ...category });
  } catch (err) {
    next(err);
  }
};

const adminUpdateCategory = async (req, res, next) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    res.status(200).json({ success: true, ...category });
  } catch (err) {
    next(err);
  }
};

const adminDeleteCategory = async (req, res, next) => {
  try {
    await deleteCategory(req.params.id);
    res.status(200).json({ success: true, message: "Categoría eliminada correctamente" });
  } catch (err) {
    next(err);
  }
};

export { adminCreateCategory, adminUpdateCategory, adminDeleteCategory };
