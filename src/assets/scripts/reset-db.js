import mongoose from "mongoose";
import envConfig from "#config/env.config.js";
import { User } from "#models/user.model.js";
import { Address } from "#models/address.model.js";
import { Category } from "#models/category.model.js";
import { Publication } from "#models/publication.model.js";
import { Order } from "#models/order.model.js";
import { Message } from "#models/message.model.js";
import { Notification } from "#models/notification.model.js";
import { Favorite } from "#models/favorite.model.js";

const reset = async () => {
  await mongoose.connect(envConfig.mongodbUri);
  console.log("🍃  Conectado a MongoDB —", envConfig.mongodbUri);

  await Promise.all([
    User.deleteMany({}),
    Address.deleteMany({}),
    Category.deleteMany({}),
    Publication.deleteMany({}),
    Order.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
    Favorite.deleteMany({}),
  ]);

  console.log("🗑️   Base de datos limpia");

  // Iniciar con almenos una categoría "Otros" por defecto
  await Category.create({ name: "Otros" });
  console.log("✅  Categoría 'Otros' creada");

  await mongoose.disconnect();
  console.log("🔌  Desconectado");
};

try {
  await reset();
} catch (err) {
  console.error("❌ Error al limpiar la base de datos:", err.message);
  process.exit(1);
}
