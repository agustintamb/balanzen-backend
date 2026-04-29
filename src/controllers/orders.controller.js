import {
  createOrder,
  listOrders,
  getOrderById,
  cancelOrder,
  deliverOrder,
} from "#services/orders.service.js";

const createOrderHandler = async (req, res, next) => {
  try {
    const order = await createOrder(req.user.id, req.body.publication_id);
    res.status(201).json({ success: true, ...order });
  } catch (err) {
    next(err);
  }
};

const listOrdersHandler = async (req, res, next) => {
  try {
    const result = await listOrders(req.user.id, req.user.role, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getOrderHandler = async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id, req.user.id);
    res.status(200).json({ success: true, ...order });
  } catch (err) {
    next(err);
  }
};

const cancelOrderHandler = async (req, res, next) => {
  try {
    await cancelOrder(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: "Pedido cancelado correctamente" });
  } catch (err) {
    next(err);
  }
};

const deliverOrderHandler = async (req, res, next) => {
  try {
    await deliverOrder(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: "Pedido marcado como entregado" });
  } catch (err) {
    next(err);
  }
};

export {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
  cancelOrderHandler,
  deliverOrderHandler,
};
