import { createCategory, updateCategory, deleteCategory } from "#services/categories.service.js";
import { listAllPublications } from "#services/publications.service.js";
import { listAllOrders } from "#services/orders.service.js";
import { getAdminUserProfile } from "#services/users.service.js";
import { listUsers } from "#services/admin.service.js";

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

const adminListPublications = async (req, res, next) => {
  try {
    const result = await listAllPublications(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const adminListOrders = async (req, res, next) => {
  try {
    const result = await listAllOrders(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const adminGetUser = async (req, res, next) => {
  try {
    const profile = await getAdminUserProfile(req.params.id);
    res.status(200).json({ success: true, ...profile });
  } catch (err) {
    next(err);
  }
};

const adminListUsers = async (req, res, next) => {
  try {
    const result = await listUsers(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export {
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminListPublications,
  adminListOrders,
  adminGetUser,
  adminListUsers,
};
