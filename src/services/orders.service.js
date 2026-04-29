import { Order } from "#models/order.model.js";
import { Publication } from "#models/publication.model.js";
import { User } from "#models/user.model.js";
import { Address } from "#models/address.model.js";
import { createNotification } from "#services/notification.service.js";

const buildPublicationSnippet = (pub) => ({
  id: pub._id,
  title: pub.title,
  final_price: pub.final_price,
  photos: pub.photos,
});

const buildCommerceSnippet = async (commerceId) => {
  const [commerce, address] = await Promise.all([
    User.findById(commerceId),
    Address.findOne({ user_id: commerceId, is_selected: true }),
  ]);
  return {
    id: commerce._id,
    business_name: commerce.business_name,
    selected_address: address ? { formatted_address: address.formatted_address } : null,
  };
};

const buildConsumerSnippet = async (consumerId) => {
  const consumer = await User.findById(consumerId);
  return { id: consumer._id, first_name: consumer.first_name, last_name: consumer.last_name };
};

const buildOrderResponse = async (order, role) => {
  const pub = await Publication.findWithDeleted({ _id: order.publication_id }).then((r) => r[0]);

  const base = {
    id: order._id,
    publication: pub ? buildPublicationSnippet(pub) : null,
    status: order.status,
    created_at: order.created_at,
  };

  if (role === "CONSUMIDOR") {
    base.commerce = await buildCommerceSnippet(order.commerce_id);
  } else {
    base.consumer = await buildConsumerSnippet(order.consumer_id);
    base.commerce = await buildCommerceSnippet(order.commerce_id);
  }

  return base;
};

const createOrder = async (consumerId, publicationId) => {
  const pub = await Publication.findById(publicationId);
  if (!pub) {
    const err = new Error("Publicación no encontrada");
    err.status = 404;
    throw err;
  }
  if (pub.status !== "ACTIVE") {
    const err = new Error("La publicación no está disponible para reservar");
    err.status = 409;
    throw err;
  }

  const existing = await Order.findOne({ publication_id: publicationId, status: "RESERVED" });
  if (existing) {
    const err = new Error("La publicación ya tiene una reserva activa");
    err.status = 409;
    throw err;
  }

  const order = await Order.create({
    publication_id: publicationId,
    consumer_id: consumerId,
    commerce_id: pub.commerce_id,
  });

  await Publication.findByIdAndUpdate(publicationId, { status: "RESERVED" });

  const [consumer, commerceSnippet] = await Promise.all([
    buildConsumerSnippet(consumerId),
    buildCommerceSnippet(pub.commerce_id),
  ]);

  await createNotification({
    userId: pub.commerce_id,
    type: "NEW_RESERVATION",
    title: "Nueva reserva",
    message: `Tu publicación "${pub.title}" fue reservada.`,
    referenceId: order._id,
    referenceType: "ORDER",
  }).catch(() => {});

  return {
    id: order._id,
    publication: buildPublicationSnippet(pub),
    consumer,
    commerce: commerceSnippet,
    status: order.status,
    created_at: order.created_at,
  };
};

const listOrders = async (userId, role, query) => {
  const { status, page = 1, limit = 20 } = query;

  const filter = role === "CONSUMIDOR" ? { consumer_id: userId } : { commerce_id: userId };
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ created_at: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  const results = await Promise.all(orders.map((o) => buildOrderResponse(o, role)));

  return {
    orders: results,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getOrderById = async (id, userId) => {
  const order = await Order.findById(id);
  if (!order) {
    const err = new Error("Pedido no encontrado");
    err.status = 404;
    throw err;
  }
  if (order.consumer_id !== userId && order.commerce_id !== userId) {
    const err = new Error("No tenés acceso a este pedido");
    err.status = 403;
    throw err;
  }

  const pub = await Publication.findWithDeleted({ _id: order.publication_id }).then((r) => r[0]);
  const [consumer, commerceSnippet] = await Promise.all([
    buildConsumerSnippet(order.consumer_id),
    buildCommerceSnippet(order.commerce_id),
  ]);

  return {
    id: order._id,
    publication: pub ? buildPublicationSnippet(pub) : null,
    consumer,
    commerce: commerceSnippet,
    status: order.status,
    created_at: order.created_at,
  };
};

const cancelOrder = async (id, userId) => {
  const order = await Order.findById(id);
  if (!order) {
    const err = new Error("Pedido no encontrado");
    err.status = 404;
    throw err;
  }
  if (order.consumer_id !== userId && order.commerce_id !== userId) {
    const err = new Error("No tenés acceso a este pedido");
    err.status = 403;
    throw err;
  }
  if (order.status !== "RESERVED") {
    const err = new Error("Solo se pueden cancelar pedidos en estado RESERVED");
    err.status = 409;
    throw err;
  }

  await Order.findByIdAndUpdate(id, { status: "CANCELLED" });

  const pub = await Publication.findWithDeleted({ _id: order.publication_id }).then((r) => r[0]);
  if (pub && new Date(pub.expiry_date) > new Date()) {
    await Publication.findByIdAndUpdate(order.publication_id, { status: "ACTIVE" });
  }

  const isCancelledByConsumer = order.consumer_id === userId;
  await createNotification({
    userId: isCancelledByConsumer ? order.commerce_id : order.consumer_id,
    type: isCancelledByConsumer
      ? "RESERVATION_CANCELLED_BY_CONSUMER"
      : "RESERVATION_CANCELLED_BY_COMMERCE",
    title: "Reserva cancelada",
    message: isCancelledByConsumer
      ? `El consumidor canceló la reserva de "${pub?.title ?? "la publicación"}".`
      : `El comercio canceló tu reserva de "${pub?.title ?? "la publicación"}".`,
    referenceId: id,
    referenceType: "ORDER",
  }).catch(() => {});
};

const deliverOrder = async (id, commerceId) => {
  const order = await Order.findById(id);
  if (!order) {
    const err = new Error("Pedido no encontrado");
    err.status = 404;
    throw err;
  }
  if (order.commerce_id !== commerceId) {
    const err = new Error("No tenés permisos para marcar este pedido como entregado");
    err.status = 403;
    throw err;
  }
  if (order.status !== "RESERVED") {
    const err = new Error("Solo se pueden entregar pedidos en estado RESERVED");
    err.status = 409;
    throw err;
  }

  const [pub] = await Promise.all([
    Publication.findWithDeleted({ _id: order.publication_id }).then((r) => r[0]),
    Order.findByIdAndUpdate(id, { status: "DELIVERED" }),
    Publication.findByIdAndUpdate(order.publication_id, { status: "DELIVERED" }),
  ]);

  await createNotification({
    userId: order.consumer_id,
    type: "ORDER_DELIVERED",
    title: "Pedido entregado",
    message: `Tu pedido de "${pub?.title ?? "la publicación"}" fue marcado como entregado.`,
    referenceId: id,
    referenceType: "ORDER",
  }).catch(() => {});
};

const listAllOrders = async (query) => {
  const { status, consumer_id, commerce_id, page = 1, limit = 20 } = query;

  const filter = {};
  if (status) filter.status = status;
  if (consumer_id) filter.consumer_id = consumer_id;
  if (commerce_id) filter.commerce_id = commerce_id;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ created_at: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  const results = await Promise.all(orders.map((o) => buildOrderResponse(o, "COMERCIO")));

  return {
    orders: results,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / Number(limit)),
    },
  };
};

export { createOrder, listOrders, getOrderById, cancelOrder, deliverOrder, listAllOrders };
