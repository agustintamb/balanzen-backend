import { Message } from "#models/message.model.js";
import { ChatRead } from "#models/chat-read.model.js";

const getUnreadCount = async (orderId, userId) => {
  const chatRead = await ChatRead.findOne({ user_id: userId, order_id: orderId });
  const lastReadAt = chatRead?.last_read_at ?? new Date(0);
  return Message.countDocuments({
    order_id: orderId,
    sender_id: { $ne: userId },
    created_at: { $gt: lastReadAt },
  });
};

export { getUnreadCount };
