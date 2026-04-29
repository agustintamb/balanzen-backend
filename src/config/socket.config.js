import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import envConfig from "#config/env.config.js";

let io = null;

export const getIO = () => {
  if (!io) throw new Error("Socket.io no está inicializado");
  return io;
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    path: "/ws",
    cors: {
      origin: envConfig.allowedOrigins.length ? envConfig.allowedOrigins : "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("authenticate", ({ token }) => {
      try {
        const payload = jwt.verify(token, envConfig.jwt.secret);
        socket.userId = payload.id;
        socket.join(`user:${payload.id}`);
        socket.emit("authenticated", { user_id: payload.id });
      } catch {
        socket.emit("error", { code: "AUTH_FAILED", message: "Token inválido" });
      }
    });

    socket.on("join_chat", ({ order_id }) => {
      if (!socket.userId) return;
      socket.join(`order:${order_id}`);
    });

    socket.on("leave_chat", ({ order_id }) => {
      socket.leave(`order:${order_id}`);
    });

    socket.on("typing", ({ order_id, is_typing }) => {
      if (!socket.userId) return;
      socket.to(`order:${order_id}`).emit("user_typing", {
        order_id,
        user_id: socket.userId,
        is_typing,
      });
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        io.emit("user_online", { user_id: socket.userId, is_online: false });
      }
    });
  });

  return io;
};
