import { Message } from "#models/message.model.js";
import { Order } from "#models/order.model.js";
import { Publication } from "#models/publication.model.js";
import { User } from "#models/user.model.js";
import { ChatRead } from "#models/chat-read.model.js";
import { getIO } from "#config/socket.config.js";
import { createNotification } from "#services/notification.service.js";
import { getUnreadCount } from "#utils/unread.helper.js";

const markChatAsRead = async (orderId, userId) => {
  await ChatRead.findOneAndUpdate(
    { user_id: userId, order_id: orderId },
    { last_read_at: new Date() },
    { upsert: true }
  );
};

const resolveOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error("Pedido no encontrado");
    err.status = 404;
    throw err;
  }
  if (order.consumer_id !== userId && order.commerce_id !== userId) {
    const err = new Error("No tenés acceso a este chat");
    err.status = 403;
    throw err;
  }
  return order;
};

const listChats = async (userId) => {
  const orders = await Order.find({
    $or: [{ consumer_id: userId }, { commerce_id: userId }],
  }).sort({ created_at: -1 });

  const chats = await Promise.all(
    orders.map(async (order) => {
      const counterpartId = order.consumer_id === userId ? order.commerce_id : order.consumer_id;

      const [counterpart, pub, lastMessage] = await Promise.all([
        User.findById(counterpartId),
        Publication.findWithDeleted({ _id: order.publication_id }).then((r) => r[0]),
        Message.findOne({ order_id: order._id }).sort({ created_at: -1 }),
      ]);

      return {
        order_id: order._id,
        counterpart: counterpart
          ? {
              id: counterpart._id,
              first_name: counterpart.first_name,
              last_name: counterpart.last_name,
              photo_url: counterpart.photo_url,
              business_name: counterpart.business_name ?? null,
            }
          : null,
        publication_title: pub?.title ?? null,
        last_message: lastMessage
          ? {
              content: lastMessage.content,
              sender_id: lastMessage.sender_id,
              created_at: lastMessage.created_at,
            }
          : null,
        unread_count: await getUnreadCount(order._id, userId),
        order_status: order.status,
      };
    })
  );

  return { chats };
};

const getMessages = async (orderId, userId, query) => {
  await resolveOrder(orderId, userId);
  await markChatAsRead(orderId, userId);

  const { page = 1, limit = 50 } = query;
  const [messages, total] = await Promise.all([
    Message.find({ order_id: orderId })
      .sort({ created_at: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Message.countDocuments({ order_id: orderId }),
  ]);

  return {
    messages: messages.map((m) => ({
      id: m._id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / Number(limit)),
    },
  };
};

const sendMessage = async (orderId, senderId, content) => {
  const order = await resolveOrder(orderId, senderId);

  if (order.status !== "RESERVED") {
    const err = new Error("Solo se pueden enviar mensajes en pedidos activos (RESERVED)");
    err.status = 409;
    throw err;
  }

  const message = await Message.create({ order_id: orderId, sender_id: senderId, content });
  await markChatAsRead(orderId, senderId);

  const payload = {
    id: message._id,
    order_id: orderId,
    sender_id: senderId,
    content: message.content,
    created_at: message.created_at,
  };

  // Emitir por WebSocket a la sala del order
  try {
    const io = getIO();
    io.to(`order:${orderId}`).emit("new_message", {
      order_id: orderId,
      sender_id: senderId,
      content: message.content,
      timestamp: message.created_at,
    });
  } catch {
    // io no disponible en tests
  }

  const recipientId = order.consumer_id === senderId ? order.commerce_id : order.consumer_id;
  await createNotification({
    userId: recipientId,
    type: "NEW_MESSAGE",
    title: "Nuevo mensaje",
    message: "Tenés un nuevo mensaje en tu pedido.",
    referenceId: orderId,
    referenceType: "ORDER",
  }).catch(() => {});

  return payload;
};

export { listChats, getMessages, sendMessage, markChatAsRead };
