import { listChats, getMessages, sendMessage } from "#services/chat.service.js";

const listChatsHandler = async (req, res, next) => {
  try {
    const result = await listChats(req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getMessagesHandler = async (req, res, next) => {
  try {
    const result = await getMessages(req.params.orderId, req.user.id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const sendMessageHandler = async (req, res, next) => {
  try {
    const message = await sendMessage(req.params.orderId, req.user.id, req.body.content);
    res.status(201).json({ success: true, ...message });
  } catch (err) {
    next(err);
  }
};

export { listChatsHandler, getMessagesHandler, sendMessageHandler };
