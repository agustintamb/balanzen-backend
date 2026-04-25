import mongoose from "mongoose";
import envConfig from "#config/env.config.js";
import { User } from "#models/user.model.js";
import { hashPassword } from "#services/auth.service.js";

const seed = async () => {
  await mongoose.connect(envConfig.mongodbUri);
  console.log("🍃  Conectado a MongoDB");

  const adminEmail = "admin@balanzen.com";
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    console.log("⚠️  El admin ya existe, omitiendo...");
  } else {
    const password = await hashPassword("Admin123");
    await User.create({
      email: adminEmail,
      password,
      role: "ADMIN",
      first_name: "Admin",
      last_name: "BalanZen",
      phone: "1100000000",
      dni: "00000000",
    });
    console.log("✅  Admin creado: admin@balanzen.com / Admin123");
  }

  await mongoose.disconnect();
  console.log("🔌  Desconectado");
};

seed().catch((err) => {
  console.error("❌ Error en seed:", err.message);
  process.exit(1);
});
