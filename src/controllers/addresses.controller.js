import {
  searchAddresses as searchAddressesService,
  getMyAddresses as getMyAddressesService,
  createAddress as createAddressService,
  updateAddress as updateAddressService,
  deleteAddress as deleteAddressService,
  selectAddress as selectAddressService,
} from "#services/addresses.service.js";

const searchAddresses = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: "El parámetro q es requerido" });
    }
    const data = await searchAddressesService(q);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getMyAddresses = async (req, res, next) => {
  try {
    const data = await getMyAddressesService(req.user.id);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const createAddress = async (req, res, next) => {
  try {
    const address = await createAddressService(req.user.id, req.user.role, req.body);
    res.status(201).json({ success: true, ...address });
  } catch (err) {
    next(err);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const address = await updateAddressService(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, ...address });
  } catch (err) {
    next(err);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    await deleteAddressService(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: "Dirección eliminada correctamente" });
  } catch (err) {
    next(err);
  }
};

const selectAddress = async (req, res, next) => {
  try {
    const address = await selectAddressService(req.user.id, req.params.id);
    res.status(200).json({ success: true, ...address });
  } catch (err) {
    next(err);
  }
};

export {
  searchAddresses,
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  selectAddress,
};
