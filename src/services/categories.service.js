import { Category } from "#models/category.model.js";

const listCategories = async () => {
  const categories = await Category.find().sort({ name: 1 });
  return categories.map((c) => ({
    id: c._id,
    name: c.name,
    icon_url: c.icon_url,
    active: c.active,
  }));
};

const createCategory = async ({ name, icon_url }) => {
  const existing = await Category.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (existing) {
    const err = new Error("Ya existe una categoría con ese nombre");
    err.status = 409;
    throw err;
  }
  const category = await Category.create({ name, icon_url: icon_url ?? null });
  return {
    id: category._id,
    name: category.name,
    icon_url: category.icon_url,
    active: category.active,
  };
};

const updateCategory = async (id, { name, icon_url, active }) => {
  const category = await Category.findById(id);
  if (!category) {
    const err = new Error("Categoría no encontrada");
    err.status = 404;
    throw err;
  }

  if (name && name !== category.name) {
    const existing = await Category.findOne({ name: new RegExp(`^${name}$`, "i") });
    if (existing && existing._id !== id) {
      const err = new Error("Ya existe una categoría con ese nombre");
      err.status = 409;
      throw err;
    }
  }

  const update = {};
  if (name !== undefined) update.name = name;
  if (icon_url !== undefined) update.icon_url = icon_url;
  if (active !== undefined) update.active = active;

  await Category.findByIdAndUpdate(id, update, { runValidators: true });
  const updated = await Category.findById(id);
  return {
    id: updated._id,
    name: updated.name,
    icon_url: updated.icon_url,
    active: updated.active,
  };
};

const deleteCategory = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    const err = new Error("Categoría no encontrada");
    err.status = 404;
    throw err;
  }
  await category.softDelete();
};

export { listCategories, createCategory, updateCategory, deleteCategory };
