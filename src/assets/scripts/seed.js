import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import envConfig from "#config/env.config.js";
import { cloudinary, folderPrefix } from "#config/cloudinary.config.js";
import { User } from "#models/user.model.js";
import { Address } from "#models/address.model.js";
import { Category } from "#models/category.model.js";
import { Publication } from "#models/publication.model.js";
import { Order } from "#models/order.model.js";
import { Message } from "#models/message.model.js";
import { Notification } from "#models/notification.model.js";
import { Favorite } from "#models/favorite.model.js";
import { hashPassword } from "#services/auth.service.js";
import { selectAddress } from "#services/addresses.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATEGORIES = ["Verduras", "Frutas", "Panificados", "Lácteos", "Carnes", "Bebidas", "Otros"];
const days = (n) => new Date(Date.now() + n * 86400000);

const seed = async () => {
  await mongoose.connect(envConfig.mongodbUri);
  console.log("🍃  Conectado a MongoDB");

  // --- Limpiar colecciones ---
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
  console.log("🗑️   Colecciones limpiadas");

  // --- Fotos de perfil (Cloudinary) ---
  const getOrUploadPhoto = async (filename) => {
    const publicId = `${folderPrefix}/avatars/${filename.replace(/\.[^.]+$/, "")}`;
    try {
      const existing = await cloudinary.api.resource(publicId);
      return existing.secure_url;
    } catch {
      const result = await cloudinary.uploader.upload(
        path.resolve(__dirname, `../images/${filename}`),
        {
          public_id: publicId,
          transformation: [{ quality: "auto", fetch_format: "auto", width: 400, crop: "limit" }],
        }
      );
      return result.secure_url;
    }
  };

  const [photoConsumidor, photoComericio] = await Promise.all([
    getOrUploadPhoto("foto_consumidor.jpg"),
    getOrUploadPhoto("foto_comercio.jpg"),
  ]);
  console.log("✅  Fotos de perfil listas en Cloudinary");

  // --- Limpiar imágenes de usuarios en Cloudinary (conserva los assets seed) ---
  const seedPublicIds = new Set([
    `${folderPrefix}/avatars/foto_consumidor`,
    `${folderPrefix}/avatars/foto_comercio`,
  ]);

  const toDelete = [];
  let nextCursor;
  do {
    const page = await cloudinary.api.resources({
      type: "upload",
      prefix: folderPrefix,
      max_results: 500,
      ...(nextCursor && { next_cursor: nextCursor }),
    });
    for (const resource of page.resources) {
      if (!seedPublicIds.has(resource.public_id)) {
        toDelete.push(resource.public_id);
      }
    }
    nextCursor = page.next_cursor;
  } while (nextCursor);

  for (let i = 0; i < toDelete.length; i += 100) {
    await cloudinary.api.delete_resources(toDelete.slice(i, i + 100));
  }
  console.log(`✅  Cloudinary limpiado (${toDelete.length} imágenes eliminadas)`);

  // --- Admin ---
  const adminPassword = await hashPassword("Admin123");
  await User.create({
    email: "admin@balanzen.com",
    password: adminPassword,
    role: "ADMIN",
    first_name: "Admin",
    last_name: "BalanZen",
    phone: "1100000000",
    dni: "00000000",
  });
  console.log("✅  Admin creado: admin@balanzen.com / Admin123");

  // --- Categorías ---
  const catMap = {};
  for (const name of CATEGORIES) {
    const cat = await Category.create({ name });
    catMap[name] = cat._id;
  }
  console.log("✅  7 categorías creadas");

  const password = await hashPassword("Test1234");

  // ===== COMERCIOS (7) =====

  // 1. El Hornito — Panadería
  const hornito = await User.create({
    email: "facundo@elhornito.com",
    password,
    role: "COMERCIO",
    first_name: "Facundo",
    last_name: "Rossi",
    phone: "1144556677",
    dni: "28111111",
    business_name: "Panadería El Hornito",
    cuit: "20281111112",
    photo_url: photoComericio,
  });
  const hornitAddr1 = await Address.create({
    user_id: hornito._id,
    formatted_address: "Av. Corrientes 2468, Balvanera, CABA",
    street: "Av. Corrientes",
    number: "2468",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6068,
    lng: -58.4033,
  });
  await Address.create({
    user_id: hornito._id,
    formatted_address: "Av. Callao 900, Balvanera, CABA",
    street: "Av. Callao",
    number: "900",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6052,
    lng: -58.3924,
  });
  await Address.create({
    user_id: hornito._id,
    formatted_address: "Av. Córdoba 1500, Buenos Aires, CABA",
    street: "Av. Córdoba",
    number: "1500",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5997,
    lng: -58.3912,
  });
  await selectAddress(hornito._id, hornitAddr1._id);

  // 2. La Esquina de Ernesto — Frutería y Verdulería
  const ernesto = await User.create({
    email: "ernesto@verduleria.com",
    password,
    role: "COMERCIO",
    first_name: "Ernesto",
    last_name: "Villalba",
    phone: "1133445566",
    dni: "26222222",
    business_name: "Frutería y Verdulería La Esquina de Ernesto",
    cuit: "20262222223",
    photo_url: photoComericio,
  });
  const ernestoAddr1 = await Address.create({
    user_id: ernesto._id,
    formatted_address: "Balcarce 460, San Telmo, CABA",
    street: "Balcarce",
    number: "460",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6198,
    lng: -58.3728,
  });
  await Address.create({
    user_id: ernesto._id,
    formatted_address: "Chile 800, San Telmo, CABA",
    street: "Chile",
    number: "800",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6227,
    lng: -58.3698,
  });
  await Address.create({
    user_id: ernesto._id,
    formatted_address: "Av. Independencia 1200, San Telmo, CABA",
    street: "Av. Independencia",
    number: "1200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6247,
    lng: -58.3842,
  });
  await selectAddress(ernesto._id, ernestoAddr1._id);

  // 3. La Despensa de Rosi — Almacén
  const rosi = await User.create({
    email: "rosi@ladespensa.com",
    password,
    role: "COMERCIO",
    first_name: "Rosario",
    last_name: "Medina",
    phone: "1122334455",
    dni: "29333333",
    business_name: "Almacén La Despensa de Rosi",
    cuit: "27293333334",
    photo_url: photoComericio,
  });
  const rosiAddr1 = await Address.create({
    user_id: rosi._id,
    formatted_address: "Av. Rivadavia 5600, Caballito, CABA",
    street: "Av. Rivadavia",
    number: "5600",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6178,
    lng: -58.4362,
  });
  await Address.create({
    user_id: rosi._id,
    formatted_address: "Av. Acoyte 300, Caballito, CABA",
    street: "Av. Acoyte",
    number: "300",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6158,
    lng: -58.4381,
  });
  await Address.create({
    user_id: rosi._id,
    formatted_address: "Rojas 500, Caballito, CABA",
    street: "Rojas",
    number: "500",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6201,
    lng: -58.4472,
  });
  await selectAddress(rosi._id, rosiAddr1._id);

  // 4. La Cervecería Artesanal — Lucía (sin dirección)
  await User.create({
    email: "lucia@lacerveceria.com",
    password,
    role: "COMERCIO",
    first_name: "Lucía",
    last_name: "Paredes",
    phone: "1155443322",
    dni: "31444444",
    business_name: "La Cervecería Artesanal",
    cuit: "27314444445",
    photo_url: photoComericio,
  });

  // 5. Carnicería San José — Pedro [NUEVO]
  const pedro = await User.create({
    email: "pedro@carniceria.com",
    password,
    role: "COMERCIO",
    first_name: "Pedro",
    last_name: "García",
    phone: "1144332211",
    dni: "27888888",
    business_name: "Carnicería San José",
    cuit: "20278888889",
    photo_url: photoComericio,
  });
  const pedroAddr1 = await Address.create({
    user_id: pedro._id,
    formatted_address: "Medrano 800, Almagro, CABA",
    street: "Medrano",
    number: "800",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6117,
    lng: -58.4177,
  });
  await Address.create({
    user_id: pedro._id,
    formatted_address: "Av. Díaz Vélez 3900, Caballito, CABA",
    street: "Av. Díaz Vélez",
    number: "3900",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6201,
    lng: -58.4334,
  });
  await selectAddress(pedro._id, pedroAddr1._id);

  // 6. Mercado Todo — Marta [NUEVO]
  const marta = await User.create({
    email: "marta@mercadotodo.com",
    password,
    role: "COMERCIO",
    first_name: "Marta",
    last_name: "Domínguez",
    phone: "1133221100",
    dni: "30999999",
    business_name: "Mercado Todo",
    cuit: "27309999993",
    photo_url: photoComericio,
  });
  const martaAddr1 = await Address.create({
    user_id: marta._id,
    formatted_address: "Av. Boedo 700, Boedo, CABA",
    street: "Av. Boedo",
    number: "700",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6287,
    lng: -58.4122,
  });
  await Address.create({
    user_id: marta._id,
    formatted_address: "Estados Unidos 2200, Boedo, CABA",
    street: "Estados Unidos",
    number: "2200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6355,
    lng: -58.4013,
  });
  await selectAddress(marta._id, martaAddr1._id);

  // 7. Pizzería Rey — Carlos [NUEVO]
  const carlos = await User.create({
    email: "carlos@pizzeriarey.com",
    password,
    role: "COMERCIO",
    first_name: "Carlos",
    last_name: "Reyes",
    phone: "1122110099",
    dni: "32101010",
    business_name: "Pizzería Rey",
    cuit: "20321010102",
    photo_url: photoComericio,
  });
  const carlosAddr1 = await Address.create({
    user_id: carlos._id,
    formatted_address: "Triunvirato 2200, Villa Urquiza, CABA",
    street: "Triunvirato",
    number: "2200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5889,
    lng: -58.4922,
  });
  await Address.create({
    user_id: carlos._id,
    formatted_address: "Av. Federico Lacroze 4200, Villa Urquiza, CABA",
    street: "Av. Federico Lacroze",
    number: "4200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5752,
    lng: -58.4729,
  });
  await selectAddress(carlos._id, carlosAddr1._id);

  console.log("✅  7 comercios creados (6 con dirección, 1 sin dirección)");

  // ===== CONSUMIDORES (12) =====

  // 1. Valentina Suárez
  const valentina = await User.create({
    email: "valentina@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Valentina",
    last_name: "Suárez",
    phone: "1155667788",
    dni: "37111111",
    photo_url: photoConsumidor,
  });
  const valAddr1 = await Address.create({
    user_id: valentina._id,
    formatted_address: "Thames 1500, Palermo, CABA",
    street: "Thames",
    number: "1500",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5886,
    lng: -58.4271,
  });
  await Address.create({
    user_id: valentina._id,
    formatted_address: "Av. Corrientes 4200, Villa Crespo, CABA",
    street: "Av. Corrientes",
    number: "4200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5988,
    lng: -58.4398,
  });
  await Address.create({
    user_id: valentina._id,
    formatted_address: "Guatemala 4700, Palermo, CABA",
    street: "Guatemala",
    number: "4700",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5832,
    lng: -58.4239,
  });
  await Address.create({
    user_id: valentina._id,
    formatted_address: "Malabia 1800, Palermo, CABA",
    street: "Malabia",
    number: "1800",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5863,
    lng: -58.4306,
  });
  await selectAddress(valentina._id, valAddr1._id);

  // 2. Gonzalo López
  const gonzalo = await User.create({
    email: "gonzalo@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Gonzalo",
    last_name: "López",
    phone: "1166778899",
    dni: "38222222",
    photo_url: photoConsumidor,
  });
  const gonzAddr1 = await Address.create({
    user_id: gonzalo._id,
    formatted_address: "Cabildo 2000, Belgrano, CABA",
    street: "Cabildo",
    number: "2000",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5617,
    lng: -58.4583,
  });
  await Address.create({
    user_id: gonzalo._id,
    formatted_address: "Av. del Libertador 6000, Núñez, CABA",
    street: "Av. del Libertador",
    number: "6000",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5463,
    lng: -58.4641,
  });
  await Address.create({
    user_id: gonzalo._id,
    formatted_address: "Juramento 2400, Belgrano, CABA",
    street: "Juramento",
    number: "2400",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5591,
    lng: -58.4612,
  });
  await Address.create({
    user_id: gonzalo._id,
    formatted_address: "Virrey del Pino 2800, Belgrano, CABA",
    street: "Virrey del Pino",
    number: "2800",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5547,
    lng: -58.4573,
  });
  await selectAddress(gonzalo._id, gonzAddr1._id);

  // 3. Sofía Romero
  const sofia = await User.create({
    email: "sofia@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Sofía",
    last_name: "Romero",
    phone: "1177889900",
    dni: "39333333",
    photo_url: photoConsumidor,
  });
  const sofiaAddr1 = await Address.create({
    user_id: sofia._id,
    formatted_address: "Defensa 800, San Telmo, CABA",
    street: "Defensa",
    number: "800",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6224,
    lng: -58.3712,
  });
  await Address.create({
    user_id: sofia._id,
    formatted_address: "Av. Regimiento Patricios 1200, Barracas, CABA",
    street: "Av. Regimiento Patricios",
    number: "1200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6391,
    lng: -58.3827,
  });
  await Address.create({
    user_id: sofia._id,
    formatted_address: "Humberto I 1000, San Telmo, CABA",
    street: "Humberto I",
    number: "1000",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6261,
    lng: -58.3692,
  });
  await selectAddress(sofia._id, sofiaAddr1._id);

  // 4. Diego Hernández
  const diego = await User.create({
    email: "diego@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Diego",
    last_name: "Hernández",
    phone: "1188990011",
    dni: "40444444",
    photo_url: photoConsumidor,
  });
  const diegoAddr1 = await Address.create({
    user_id: diego._id,
    formatted_address: "Av. Rivadavia 7000, Flores, CABA",
    street: "Av. Rivadavia",
    number: "7000",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6295,
    lng: -58.4613,
  });
  await Address.create({
    user_id: diego._id,
    formatted_address: "Av. Acoyte 100, Caballito, CABA",
    street: "Av. Acoyte",
    number: "100",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6158,
    lng: -58.4381,
  });
  await Address.create({
    user_id: diego._id,
    formatted_address: "Membrillar 2000, Flores, CABA",
    street: "Membrillar",
    number: "2000",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6318,
    lng: -58.4727,
  });
  await selectAddress(diego._id, diegoAddr1._id);

  // 5. Natalia Ferreyra
  const natalia = await User.create({
    email: "natalia@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Natalia",
    last_name: "Ferreyra",
    phone: "1199001122",
    dni: "41555555",
    photo_url: photoConsumidor,
  });
  const nataliaAddr1 = await Address.create({
    user_id: natalia._id,
    formatted_address: "Av. Alvear 1800, Recoleta, CABA",
    street: "Av. Alvear",
    number: "1800",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5858,
    lng: -58.3928,
  });
  await Address.create({
    user_id: natalia._id,
    formatted_address: "Libertad 500, Retiro, CABA",
    street: "Libertad",
    number: "500",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5889,
    lng: -58.3742,
  });
  await Address.create({
    user_id: natalia._id,
    formatted_address: "Juncal 1600, Recoleta, CABA",
    street: "Juncal",
    number: "1600",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5872,
    lng: -58.3851,
  });
  await selectAddress(natalia._id, nataliaAddr1._id);

  // 6. Camila Torres (sin dirección)
  await User.create({
    email: "camila@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Camila",
    last_name: "Torres",
    phone: "1111223344",
    dni: "42666666",
    photo_url: photoConsumidor,
  });

  // 7. Martín Gimenez (sin dirección)
  await User.create({
    email: "martin@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Martín",
    last_name: "Gimenez",
    phone: "1122334400",
    dni: "43777777",
    photo_url: photoConsumidor,
  });

  // 8. Lucas Medina [NUEVO]
  const lucas = await User.create({
    email: "lucas@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Lucas",
    last_name: "Medina",
    phone: "1111009988",
    dni: "44121212",
    photo_url: photoConsumidor,
  });
  const lucasAddr1 = await Address.create({
    user_id: lucas._id,
    formatted_address: "Av. Santa Fe 1200, Retiro, CABA",
    street: "Av. Santa Fe",
    number: "1200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5937,
    lng: -58.3812,
  });
  await Address.create({
    user_id: lucas._id,
    formatted_address: "Av. Callao 200, San Nicolás, CABA",
    street: "Av. Callao",
    number: "200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6041,
    lng: -58.3824,
  });
  await selectAddress(lucas._id, lucasAddr1._id);

  // 9. Ana Gómez [NUEVO]
  const ana = await User.create({
    email: "ana@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Ana",
    last_name: "Gómez",
    phone: "1100998877",
    dni: "45131313",
    photo_url: photoConsumidor,
  });
  const anaAddr1 = await Address.create({
    user_id: ana._id,
    formatted_address: "Olleros 1800, Palermo, CABA",
    street: "Olleros",
    number: "1800",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5739,
    lng: -58.4324,
  });
  await Address.create({
    user_id: ana._id,
    formatted_address: "Av. Cabildo 600, Palermo, CABA",
    street: "Av. Cabildo",
    number: "600",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5742,
    lng: -58.4386,
  });
  await selectAddress(ana._id, anaAddr1._id);

  // 10. Julián Castro [NUEVO]
  const julian = await User.create({
    email: "julian@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Julián",
    last_name: "Castro",
    phone: "1199887766",
    dni: "46141414",
    photo_url: photoConsumidor,
  });
  const julianAddr1 = await Address.create({
    user_id: julian._id,
    formatted_address: "Av. Gaona 1400, Caballito, CABA",
    street: "Av. Gaona",
    number: "1400",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6189,
    lng: -58.4501,
  });
  await Address.create({
    user_id: julian._id,
    formatted_address: "Boyacá 1500, Caballito, CABA",
    street: "Boyacá",
    number: "1500",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6177,
    lng: -58.4502,
  });
  await selectAddress(julian._id, julianAddr1._id);

  // 11. Paula Vargas [NUEVO]
  const paula = await User.create({
    email: "paula@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Paula",
    last_name: "Vargas",
    phone: "1188776655",
    dni: "47151515",
    photo_url: photoConsumidor,
  });
  const paulaAddr1 = await Address.create({
    user_id: paula._id,
    formatted_address: "Av. San Juan 2000, Boedo, CABA",
    street: "Av. San Juan",
    number: "2000",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6321,
    lng: -58.4088,
  });
  await Address.create({
    user_id: paula._id,
    formatted_address: "Av. Independencia 3200, Boedo, CABA",
    street: "Av. Independencia",
    number: "3200",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6299,
    lng: -58.4171,
  });
  await selectAddress(paula._id, paulaAddr1._id);

  // 12. Roberto Silva [NUEVO]
  const roberto = await User.create({
    email: "roberto@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Roberto",
    last_name: "Silva",
    phone: "1177665544",
    dni: "36161616",
    photo_url: photoConsumidor,
  });
  const robertoAddr1 = await Address.create({
    user_id: roberto._id,
    formatted_address: "Av. Boyacá 1000, Villa del Parque, CABA",
    street: "Av. Boyacá",
    number: "1000",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6072,
    lng: -58.5003,
  });
  await Address.create({
    user_id: roberto._id,
    formatted_address: "Av. San Martín 3800, Villa del Parque, CABA",
    street: "Av. San Martín",
    number: "3800",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6083,
    lng: -58.4978,
  });
  await selectAddress(roberto._id, robertoAddr1._id);

  console.log("✅  12 consumidores creados (10 con dirección, 2 sin dirección)");

  // ===== PUBLICACIONES =====

  // --- El Hornito — Panadería (12 pubs) ---
  const pubMedialunas = await Publication.create({
    commerce_id: hornito._id,
    title: "Medialunas de manteca x12",
    description:
      "Docena de medialunas recién horneadas, sobrantes del turno mañana. Perfectas para el desayuno o merienda.",
    original_price: 2800,
    final_price: 840,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  const pubFacturas = await Publication.create({
    commerce_id: hornito._id,
    title: "Facturas surtidas x8 — vigilantes y cañoncitos",
    description:
      "Surtido del día: vigilantes de membrillo, cañoncitos de dulce de leche y libritos de crema pastelera.",
    original_price: 3200,
    final_price: 960,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: hornito._id,
    title: "Pan de campo artesanal — DONACIÓN",
    description:
      "Pan de campo grande (800g) de masa madre, sobrante del día. Lo donamos antes de tirarlo.",
    original_price: 0,
    final_price: 0,
    is_donation: true,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  const pubBizcochos = await Publication.create({
    commerce_id: hornito._id,
    title: "Bizcochos de grasa x15",
    description: "Bizcochos recién salidos del horno, bien crocantes. Lote de cierre, retiro hoy.",
    original_price: 2400,
    final_price: 960,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "RESERVED",
  });

  const pubChipa = await Publication.create({
    commerce_id: hornito._id,
    title: "Chipá de almidón x10",
    description:
      "Chipá crocantes rellenos con queso, elaborados con almidón de mandioca. Lote de cierre.",
    original_price: 1500,
    final_price: 600,
    expiry_date: days(-1),
    category_id: catMap["Panificados"],
    status: "DELIVERED",
  });

  await Publication.create({
    commerce_id: hornito._id,
    title: "Torta de ricotta y dulce de leche",
    description: "Torta casera 28cm. Venció ayer.",
    original_price: 4500,
    final_price: 1800,
    expiry_date: days(-2),
    category_id: catMap["Panificados"],
    status: "EXPIRED",
  });

  await Publication.create({
    commerce_id: hornito._id,
    title: "Alfajores de maicena x6 — DONACIÓN",
    description: "Alfajores caseros con dulce de leche. Donación cancelada.",
    original_price: 0,
    final_price: 0,
    is_donation: true,
    expiry_date: days(-3),
    category_id: catMap["Panificados"],
    status: "CANCELLED",
    deleted_at: new Date(),
  });

  const pubPanMiga = await Publication.create({
    commerce_id: hornito._id,
    title: "Pan de miga blanco x2 lonjitas",
    description:
      "Pan de miga blanco en lonjitas, ideal para sandwiches. Sobrante del turno tarde, muy fresco.",
    original_price: 1800,
    final_price: 720,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: hornito._id,
    title: "Tapas de empanada x24",
    description:
      "Tapas para empanadas al horno y fritas, lote de cierre. Congelan perfecto si no las usás hoy.",
    original_price: 1200,
    final_price: 480,
    expiry_date: days(2),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  const pubTortaChocolate = await Publication.create({
    commerce_id: hornito._id,
    title: "Torta de chocolate 20cm",
    description:
      "Torta húmeda de chocolate con ganache. Hecha hoy, retiro antes de las 20hs. No se puede guardar para el día siguiente.",
    original_price: 5500,
    final_price: 2200,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "RESERVED",
  });

  const pubMedialunasGrasa = await Publication.create({
    commerce_id: hornito._id,
    title: "Medialunas de grasa x10",
    description:
      "Medialunas de grasa bien hojaldradas, recién salidas del horno. Lote del turno tarde.",
    original_price: 2200,
    final_price: 880,
    expiry_date: days(-1),
    category_id: catMap["Panificados"],
    status: "DELIVERED",
  });

  const pubCuernitos = await Publication.create({
    commerce_id: hornito._id,
    title: "Cuernitos de vainilla x8",
    description: "Cuernitos rellenos con crema de vainilla. Vencieron ayer.",
    original_price: 1600,
    final_price: 640,
    expiry_date: days(-2),
    category_id: catMap["Panificados"],
    status: "EXPIRED",
  });

  console.log("✅  12 publicaciones El Hornito");

  // --- La Esquina de Ernesto — Frutería y Verdulería (10 pubs) ---
  const pubBananas = await Publication.create({
    commerce_id: ernesto._id,
    title: "Bananas de Ecuador 1 kg",
    description:
      "Bananas maduras, ideales para consumo inmediato o licuados. No se van a esperar más.",
    original_price: 800,
    final_price: 320,
    expiry_date: days(2),
    category_id: catMap["Frutas"],
    status: "ACTIVE",
  });

  const pubTomates = await Publication.create({
    commerce_id: ernesto._id,
    title: "Tomates perita 800g",
    description: "Tomates maduros al punto, perfectos para tuco casero o ensalada. Compra de hoy.",
    original_price: 700,
    final_price: 280,
    expiry_date: days(2),
    category_id: catMap["Verduras"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: ernesto._id,
    title: "Naranjas de jugo 2 kg",
    description:
      "Naranjas dulces, mucha pulpa y poca cáscara. Perfectas para jugo fresco de la mañana.",
    original_price: 1200,
    final_price: 480,
    expiry_date: days(3),
    category_id: catMap["Frutas"],
    status: "ACTIVE",
  });

  const pubPeras = await Publication.create({
    commerce_id: ernesto._id,
    title: "Peras Williams x5",
    description:
      "Peras en su punto justo de madurez. Ideales para consumir hoy o mañana, no aguantan más.",
    original_price: 600,
    final_price: 240,
    expiry_date: days(2),
    category_id: catMap["Frutas"],
    status: "RESERVED",
  });

  const pubChoclos = await Publication.create({
    commerce_id: ernesto._id,
    title: "Choclos tiernos x4",
    description:
      "Choclos de cosecha local, bien tiernos. Ideales para hervir, hacer a la parrilla o en guiso.",
    original_price: 500,
    final_price: 200,
    expiry_date: days(-1),
    category_id: catMap["Verduras"],
    status: "DELIVERED",
  });

  await Publication.create({
    commerce_id: ernesto._id,
    title: "Espinacas frescas — DONACIÓN",
    description:
      "Atado de espinacas frescas del día. Las donamos antes de que venzan. Ideal para tarta o saltear con ajo.",
    original_price: 0,
    final_price: 0,
    is_donation: true,
    expiry_date: days(1),
    category_id: catMap["Verduras"],
    status: "ACTIVE",
  });

  const pubUvas = await Publication.create({
    commerce_id: ernesto._id,
    title: "Uvas negras 1 kg",
    description:
      "Uvas negras sin semilla, muy dulces. Llegaron hoy, hay que consumirlas en los próximos 2 días.",
    original_price: 1400,
    final_price: 560,
    expiry_date: days(2),
    category_id: catMap["Frutas"],
    status: "ACTIVE",
  });

  const pubZanahorias = await Publication.create({
    commerce_id: ernesto._id,
    title: "Zanahorias baby 500g",
    description:
      "Zanahorias baby peladas y listas para consumir. Ideales para jugo, ensalada o snack saludable.",
    original_price: 900,
    final_price: 360,
    expiry_date: days(2),
    category_id: catMap["Verduras"],
    status: "RESERVED",
  });

  const pubManzanas = await Publication.create({
    commerce_id: ernesto._id,
    title: "Manzanas rojas x6",
    description: "Manzanas rojas de primera, bien firmes y dulces. Compra de esta mañana.",
    original_price: 1100,
    final_price: 440,
    expiry_date: days(-1),
    category_id: catMap["Frutas"],
    status: "DELIVERED",
  });

  const pubMandarinas = await Publication.create({
    commerce_id: ernesto._id,
    title: "Mandarinas de Tucumán 2 kg",
    description:
      "Mandarinas muy jugosas y fáciles de pelar. Las favoritas del barrio. Hay para hoy y mañana.",
    original_price: 1600,
    final_price: 640,
    expiry_date: days(2),
    category_id: catMap["Frutas"],
    status: "RESERVED",
  });

  console.log("✅  10 publicaciones La Esquina de Ernesto");

  // --- La Despensa de Rosi — Almacén (9 pubs) ---
  const pubLeche = await Publication.create({
    commerce_id: rosi._id,
    title: "Leche La Serenísima entera x6 sachets",
    description:
      "Sachets de 1L de leche entera. Vencen en 3 días. Ideal para familia numerosa o jardín.",
    original_price: 4200,
    final_price: 2520,
    expiry_date: days(3),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  const pubYogur = await Publication.create({
    commerce_id: rosi._id,
    title: "Yogur firme Ser natural x4",
    description: "Yogur entero sin azúcar, 200g cada uno. Vencen en 4 días.",
    original_price: 2800,
    final_price: 1400,
    expiry_date: days(4),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  const pubQueso = await Publication.create({
    commerce_id: rosi._id,
    title: "Queso cremoso La Paulina 400g",
    description: "En horma, apto para untar o derretir. Vence en 5 días. Excelente para tostadas.",
    original_price: 3200,
    final_price: 1600,
    expiry_date: days(5),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  const pubGaseosas = await Publication.create({
    commerce_id: rosi._id,
    title: "Gaseosas surtidas x6 (Coca-Cola y 7UP)",
    description:
      "Latas 350ml de Coca-Cola y 7UP. Vencen este fin de semana. Precio para llevar todo el lote.",
    original_price: 4800,
    final_price: 2400,
    expiry_date: days(4),
    category_id: catMap["Bebidas"],
    status: "RESERVED",
  });

  await Publication.create({
    commerce_id: rosi._id,
    title: "Dulce de leche Sancor 400g",
    description:
      "Reposite de stock, vence la próxima semana. Dulce de leche repostero, ideal para facturas o tortas.",
    original_price: 1800,
    final_price: 900,
    expiry_date: days(7),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: rosi._id,
    title: "Manteca Magnolia 200g",
    description:
      "Manteca sin sal, vence en 6 días. Ideal para repostería o para untar. Stock de reposite.",
    original_price: 1400,
    final_price: 700,
    expiry_date: days(6),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  const pubMermelada = await Publication.create({
    commerce_id: rosi._id,
    title: "Mermelada Liguria frutilla 440g",
    description:
      "Frasco de vidrio, tapa nueva. Mermelada artesanal de frutilla. Vence en 10 días.",
    original_price: 2200,
    final_price: 1100,
    expiry_date: days(4),
    category_id: catMap["Otros"],
    status: "RESERVED",
  });

  const pubGalletitas = await Publication.create({
    commerce_id: rosi._id,
    title: "Galletitas Bagley surtidas x3 paquetes",
    description:
      "Tres paquetes variados: Lincoln, Oreo y Pepitos. Vencen en 5 días, en perfectas condiciones.",
    original_price: 3600,
    final_price: 1440,
    expiry_date: days(-1),
    category_id: catMap["Otros"],
    status: "DELIVERED",
  });

  const pubAceite = await Publication.create({
    commerce_id: rosi._id,
    title: "Aceite de girasol Cocinero 900ml",
    description:
      "Botella entera, stock de reposite. Vence en 2 semanas. Ideal para cocina diaria.",
    original_price: 2600,
    final_price: 1300,
    expiry_date: days(14),
    category_id: catMap["Otros"],
    status: "ACTIVE",
  });

  console.log("✅  9 publicaciones La Despensa de Rosi");

  // --- Carnicería San José — Pedro (8 pubs) ---
  const pubMilanesas = await Publication.create({
    commerce_id: pedro._id,
    title: "Milanesas de nalga x4",
    description:
      "Milanesas de nalga finas, listas para rebozar o ya rebozadas según preferencia. Frescas de hoy.",
    original_price: 4800,
    final_price: 2400,
    expiry_date: days(2),
    category_id: catMap["Carnes"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: pedro._id,
    title: "Chorizo criollo x6",
    description:
      "Chorizos criollos artesanales, mezcla de cerdo y vacuno con especias. Frescas de hoy.",
    original_price: 3600,
    final_price: 1800,
    expiry_date: days(2),
    category_id: catMap["Carnes"],
    status: "ACTIVE",
  });

  const pubHamburguesas = await Publication.create({
    commerce_id: pedro._id,
    title: "Hamburguesas caseras x4",
    description:
      "Hamburguesas de paleta con chimichurri, 200g cada una. Artesanales, sin conservantes. Congelan perfecto.",
    original_price: 4200,
    final_price: 2100,
    expiry_date: days(2),
    category_id: catMap["Carnes"],
    status: "RESERVED",
  });

  await Publication.create({
    commerce_id: pedro._id,
    title: "Pollo trozado 1.2 kg",
    description:
      "Pollo fresco trozado en cuartos. Compra de hoy, sin freezar. Listo para horno o parrilla.",
    original_price: 3800,
    final_price: 1900,
    expiry_date: days(1),
    category_id: catMap["Carnes"],
    status: "ACTIVE",
  });

  const pubPeceto = await Publication.create({
    commerce_id: pedro._id,
    title: "Peceto en tiras 500g",
    description:
      "Peceto de primera calidad cortado en tiras finas. Ideal para salteado o tiras de carne.",
    original_price: 3200,
    final_price: 1600,
    expiry_date: days(-1),
    category_id: catMap["Carnes"],
    status: "DELIVERED",
  });

  const pubAchuras = await Publication.create({
    commerce_id: pedro._id,
    title: "Achuras surtidas x2 porciones",
    description:
      "Dos porciones de achuras: chinchulines y riñones frescos. Ideales para parrilla del fin de semana.",
    original_price: 2800,
    final_price: 1400,
    expiry_date: days(1),
    category_id: catMap["Carnes"],
    status: "ACTIVE",
  });

  const pubVacio = await Publication.create({
    commerce_id: pedro._id,
    title: "Vacío premium 600g",
    description: "Corte premium. Venció ayer, no se llegó a vender.",
    original_price: 5200,
    final_price: 2600,
    expiry_date: days(-2),
    category_id: catMap["Carnes"],
    status: "EXPIRED",
  });

  await Publication.create({
    commerce_id: pedro._id,
    title: "Costillas de cerdo 800g",
    description:
      "Costillar de cerdo fresco, bien carnoso. Perfecto para asar o hacer al horno con papas.",
    original_price: 4400,
    final_price: 2200,
    expiry_date: days(2),
    category_id: catMap["Carnes"],
    status: "ACTIVE",
  });

  console.log("✅  8 publicaciones Carnicería San José");

  // --- Mercado Todo — Marta (7 pubs) ---
  const pubFideos = await Publication.create({
    commerce_id: marta._id,
    title: "Fideos Matarazzo surtidos x3 paquetes",
    description:
      "Tres paquetes 500g: tallarines, moñitos y espaguetis. Vencen en 2 semanas. Stock de reposite.",
    original_price: 3600,
    final_price: 1800,
    expiry_date: days(14),
    category_id: catMap["Otros"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: marta._id,
    title: "Arroz Molinos Río 1 kg",
    description: "Arroz largo fino, vence en 3 semanas. Bolsa sellada, en perfectas condiciones.",
    original_price: 1800,
    final_price: 900,
    expiry_date: days(21),
    category_id: catMap["Otros"],
    status: "ACTIVE",
  });

  const pubLentejas = await Publication.create({
    commerce_id: marta._id,
    title: "Lentejas x500g",
    description: "Lentejas pardas secas, vencen en 8 meses. Bolsa nueva. Ideal para guiso o sopa.",
    original_price: 1600,
    final_price: 800,
    expiry_date: days(5),
    category_id: catMap["Otros"],
    status: "RESERVED",
  });

  await Publication.create({
    commerce_id: marta._id,
    title: "Aceite de maíz Natura 900ml",
    description:
      "Botella entera sin abrir. Vence en 1 mes. Reposite de stock, ideal para fritura o aderezo.",
    original_price: 2800,
    final_price: 1400,
    expiry_date: days(30),
    category_id: catMap["Otros"],
    status: "ACTIVE",
  });

  const pubYerba = await Publication.create({
    commerce_id: marta._id,
    title: "Yerba Mate Rosamonte 500g",
    description:
      "Paquete nuevo sin abrir. Vence en 6 meses. Stock de reposite, ideal para el mate diario.",
    original_price: 2200,
    final_price: 1100,
    expiry_date: days(-1),
    category_id: catMap["Otros"],
    status: "DELIVERED",
  });

  const pubAtun = await Publication.create({
    commerce_id: marta._id,
    title: "Lata de atún La Campagnola x4",
    description:
      "Cuatro latas de atún al natural 170g. Vencen en 10 días. Excelente para ensaladas o sandwiches.",
    original_price: 3200,
    final_price: 1600,
    expiry_date: days(10),
    category_id: catMap["Otros"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: marta._id,
    title: "Azúcar La Merced 1 kg",
    description: "Bolsa de azúcar blanca 1kg. Vence en 1 año. Reposite a precio de liquidación.",
    original_price: 1400,
    final_price: 700,
    expiry_date: days(60),
    category_id: catMap["Otros"],
    status: "ACTIVE",
  });

  console.log("✅  7 publicaciones Mercado Todo");

  // --- Pizzería Rey — Carlos (6 pubs) ---
  const pubPizzaNapo = await Publication.create({
    commerce_id: carlos._id,
    title: "Pizza napolitana 34cm",
    description:
      "Pizza napolitana grande con muzzarella, tomate, ajo y albahaca. Sobrante del mediodía, ideal para cenar.",
    original_price: 6800,
    final_price: 2720,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  const pubFugazzeta = await Publication.create({
    commerce_id: carlos._id,
    title: "Fugazzeta rellena 30cm",
    description:
      "Fugazzeta con doble muzzarella y cebolla caramelizada. Sale del horno a las 18:30, retiro antes de las 21hs.",
    original_price: 7500,
    final_price: 3000,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "RESERVED",
  });

  const pubEmpanadas = await Publication.create({
    commerce_id: carlos._id,
    title: "Empanadas de carne x12",
    description:
      "Docena de empanadas al horno de carne cortada a cuchillo, bien jugosas. Sobrante del turno mediodía.",
    original_price: 8400,
    final_price: 3360,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  const pubCalzone = await Publication.create({
    commerce_id: carlos._id,
    title: "Calzone de ricotta y espinaca",
    description:
      "Calzone relleno con ricotta, espinaca y muzzarella. Excelente combinación, sobrante del mediodía.",
    original_price: 5600,
    final_price: 2240,
    expiry_date: days(-1),
    category_id: catMap["Panificados"],
    status: "DELIVERED",
  });

  await Publication.create({
    commerce_id: carlos._id,
    title: "Media docena empanadas de humita",
    description:
      "Seis empanadas de humita al horno, bien cremosas. Sobrante del turno. Listo para llevar.",
    original_price: 4200,
    final_price: 1680,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: carlos._id,
    title: "Pizza de mozzarella 34cm — DONACIÓN",
    description:
      "Pizza entera de muzzarella, sobrante del cierre. La donamos antes de tirarla. Retiro antes de las 22hs.",
    original_price: 0,
    final_price: 0,
    is_donation: true,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  console.log("✅  6 publicaciones Pizzería Rey");

  // ===== ÓRDENES (20) =====

  // Órdenes existentes
  const orderValentinaBizcochos = await Order.create({
    consumer_id: valentina._id,
    commerce_id: hornito._id,
    publication_id: pubBizcochos._id,
    status: "RESERVED",
  });

  const orderGonzaloPeras = await Order.create({
    consumer_id: gonzalo._id,
    commerce_id: ernesto._id,
    publication_id: pubPeras._id,
    status: "RESERVED",
  });

  const orderSofiaGaseosas = await Order.create({
    consumer_id: sofia._id,
    commerce_id: rosi._id,
    publication_id: pubGaseosas._id,
    status: "RESERVED",
  });

  const orderDiegoChoclos = await Order.create({
    consumer_id: diego._id,
    commerce_id: ernesto._id,
    publication_id: pubChoclos._id,
    status: "DELIVERED",
  });

  const orderNataliaChipa = await Order.create({
    consumer_id: natalia._id,
    commerce_id: hornito._id,
    publication_id: pubChipa._id,
    status: "DELIVERED",
  });

  await Order.create({
    consumer_id: gonzalo._id,
    commerce_id: rosi._id,
    publication_id: pubLeche._id,
    status: "CANCELLED",
  });

  // Órdenes nuevas
  const orderLucas = await Order.create({
    consumer_id: lucas._id,
    commerce_id: hornito._id,
    publication_id: pubTortaChocolate._id,
    status: "RESERVED",
  });

  const orderAna = await Order.create({
    consumer_id: ana._id,
    commerce_id: hornito._id,
    publication_id: pubMedialunasGrasa._id,
    status: "DELIVERED",
  });

  const orderJulian = await Order.create({
    consumer_id: julian._id,
    commerce_id: ernesto._id,
    publication_id: pubZanahorias._id,
    status: "RESERVED",
  });

  const orderPaula = await Order.create({
    consumer_id: paula._id,
    commerce_id: ernesto._id,
    publication_id: pubManzanas._id,
    status: "DELIVERED",
  });

  const orderRoberto = await Order.create({
    consumer_id: roberto._id,
    commerce_id: rosi._id,
    publication_id: pubMermelada._id,
    status: "RESERVED",
  });

  const orderValentina2 = await Order.create({
    consumer_id: valentina._id,
    commerce_id: rosi._id,
    publication_id: pubGalletitas._id,
    status: "DELIVERED",
  });

  const orderGonzalo2 = await Order.create({
    consumer_id: gonzalo._id,
    commerce_id: pedro._id,
    publication_id: pubHamburguesas._id,
    status: "RESERVED",
  });

  const orderDiego2 = await Order.create({
    consumer_id: diego._id,
    commerce_id: pedro._id,
    publication_id: pubPeceto._id,
    status: "DELIVERED",
  });

  await Order.create({
    consumer_id: paula._id,
    commerce_id: pedro._id,
    publication_id: pubAchuras._id,
    status: "CANCELLED",
  });

  const orderSofia2 = await Order.create({
    consumer_id: sofia._id,
    commerce_id: marta._id,
    publication_id: pubLentejas._id,
    status: "RESERVED",
  });

  const orderNatalia2 = await Order.create({
    consumer_id: natalia._id,
    commerce_id: marta._id,
    publication_id: pubYerba._id,
    status: "DELIVERED",
  });

  const orderLucas2 = await Order.create({
    consumer_id: lucas._id,
    commerce_id: carlos._id,
    publication_id: pubFugazzeta._id,
    status: "RESERVED",
  });

  const orderAna2 = await Order.create({
    consumer_id: ana._id,
    commerce_id: carlos._id,
    publication_id: pubCalzone._id,
    status: "DELIVERED",
  });

  const orderRoberto2 = await Order.create({
    consumer_id: roberto._id,
    commerce_id: ernesto._id,
    publication_id: pubMandarinas._id,
    status: "RESERVED",
  });

  console.log("✅  20 órdenes creadas");

  // ===== MENSAJES (72) =====

  // Valentina ↔ El Hornito — bizcochos (RESERVED, 5 msgs)
  await Message.create({
    order_id: orderValentinaBizcochos._id,
    sender_id: valentina._id,
    content: "Hola! Paso a buscar los bizcochos hoy a las 17hs, está bien?",
  });
  await Message.create({
    order_id: orderValentinaBizcochos._id,
    sender_id: hornito._id,
    content:
      "Buenas Valentina! Sí claro, te los tengo guardados hasta las 20hs. Estamos en Corrientes 2468.",
  });
  await Message.create({
    order_id: orderValentinaBizcochos._id,
    sender_id: valentina._id,
    content: "Perfecto, muchas gracias! Son para el desayuno de mañana.",
  });
  await Message.create({
    order_id: orderValentinaBizcochos._id,
    sender_id: hornito._id,
    content: "Excelente! Fresquitos van a estar. Cualquier cosa avisame.",
  });
  await Message.create({
    order_id: orderValentinaBizcochos._id,
    sender_id: valentina._id,
    content: "Dale, en un rato estoy.",
  });

  // Gonzalo ↔ La Esquina de Ernesto — peras (RESERVED, 3 msgs)
  await Message.create({
    order_id: orderGonzaloPeras._id,
    sender_id: gonzalo._id,
    content: "Buen día! ¿A qué hora cierran hoy para pasar a retirar las peras?",
  });
  await Message.create({
    order_id: orderGonzaloPeras._id,
    sender_id: ernesto._id,
    content:
      "Buenas Gonzalo! Hoy cerramos a las 19hs. Pasá cuando quieras, estamos en Balcarce 460.",
  });
  await Message.create({
    order_id: orderGonzaloPeras._id,
    sender_id: gonzalo._id,
    content: "Perfecto, caigo a las 18hs. Gracias!",
  });

  // Sofia ↔ La Despensa de Rosi — gaseosas (RESERVED, 4 msgs)
  await Message.create({
    order_id: orderSofiaGaseosas._id,
    sender_id: sofia._id,
    content: "Hola! Reservé las gaseosas. ¿Las pueden guardar hasta las 19hs?",
  });
  await Message.create({
    order_id: orderSofiaGaseosas._id,
    sender_id: rosi._id,
    content: "Hola Sofía! Claro, sin problema. Estamos en Rivadavia 5600, Caballito.",
  });
  await Message.create({
    order_id: orderSofiaGaseosas._id,
    sender_id: sofia._id,
    content: "Perfecto, voy a las 19hs pasadas.",
  });
  await Message.create({
    order_id: orderSofiaGaseosas._id,
    sender_id: rosi._id,
    content: "Dale, te las tenemos guardadas. ¡Hasta luego!",
  });

  // Diego ↔ La Esquina de Ernesto — choclos (DELIVERED, 4 msgs)
  await Message.create({
    order_id: orderDiegoChoclos._id,
    sender_id: diego._id,
    content: "Hola, reservé los choclos. Paso a buscarlos mañana a la mañana.",
  });
  await Message.create({
    order_id: orderDiegoChoclos._id,
    sender_id: ernesto._id,
    content: "Perfecto Diego! Te los tengo apartados.",
  });
  await Message.create({
    order_id: orderDiegoChoclos._id,
    sender_id: diego._id,
    content: "Gracias, ya los retiré. Muy tiernos, ideales para la parrilla!",
  });
  await Message.create({
    order_id: orderDiegoChoclos._id,
    sender_id: ernesto._id,
    content: "Qué bueno! Bienvenido cuando quieras.",
  });

  // Lucas ↔ El Hornito — torta de chocolate (RESERVED, 6 msgs)
  await Message.create({
    order_id: orderLucas._id,
    sender_id: lucas._id,
    content: "Buenas! Reservé la torta. ¿Tienen caja para llevarla?",
  });
  await Message.create({
    order_id: orderLucas._id,
    sender_id: hornito._id,
    content: "Hola Lucas! Sí, la embalamos bien para que no se deforme. ¿A qué hora pasás?",
  });
  await Message.create({
    order_id: orderLucas._id,
    sender_id: lucas._id,
    content: "A las 16hs aproximadamente.",
  });
  await Message.create({
    order_id: orderLucas._id,
    sender_id: hornito._id,
    content: "Perfecto. Podés pagar en efectivo o transferencia, lo que prefieras.",
  });
  await Message.create({
    order_id: orderLucas._id,
    sender_id: lucas._id,
    content: "Transferencia me viene mejor. ¿Cuál es el alias?",
  });
  await Message.create({
    order_id: orderLucas._id,
    sender_id: hornito._id,
    content: "HORNITO.CABA. Mandá el comprobante al pasar, ¡te esperamos!",
  });

  // Ana ↔ El Hornito — medialunas de grasa (DELIVERED, 4 msgs)
  await Message.create({
    order_id: orderAna._id,
    sender_id: hornito._id,
    content: "¡Hola Ana! Las medialunas de grasa están listas para retirar.",
  });
  await Message.create({
    order_id: orderAna._id,
    sender_id: ana._id,
    content: "Genial, voy en unos minutos.",
  });
  await Message.create({
    order_id: orderAna._id,
    sender_id: hornito._id,
    content: "Perfecto, te esperamos.",
  });
  await Message.create({
    order_id: orderAna._id,
    sender_id: ana._id,
    content: "Ya las retiré. Riquísimas, muchas gracias!",
  });

  // Julián ↔ La Esquina de Ernesto — zanahorias (RESERVED, 5 msgs)
  await Message.create({
    order_id: orderJulian._id,
    sender_id: julian._id,
    content: "Buenas tardes. ¿Las zanahorias llegaron hoy?",
  });
  await Message.create({
    order_id: orderJulian._id,
    sender_id: ernesto._id,
    content: "Hola Julián! Sí, compra de esta mañana. Muy buenas para jugo o para ensalada.",
  });
  await Message.create({
    order_id: orderJulian._id,
    sender_id: julian._id,
    content: "Perfecto, paso a las 17hs.",
  });
  await Message.create({
    order_id: orderJulian._id,
    sender_id: ernesto._id,
    content: "Anotado. Estamos en Balcarce 460, San Telmo.",
  });
  await Message.create({
    order_id: orderJulian._id,
    sender_id: julian._id,
    content: "¡Gracias, nos vemos pronto!",
  });

  // Paula ↔ La Esquina de Ernesto — manzanas (DELIVERED, 3 msgs)
  await Message.create({
    order_id: orderPaula._id,
    sender_id: paula._id,
    content: "Hola! Ya pasé a buscar las manzanas. Muy buenas, gracias.",
  });
  await Message.create({
    order_id: orderPaula._id,
    sender_id: ernesto._id,
    content: "Qué bueno Paula! Gracias a vos. Volvé cuando quieras.",
  });
  await Message.create({
    order_id: orderPaula._id,
    sender_id: paula._id,
    content: "La semana que viene seguro paso de nuevo.",
  });

  // Roberto ↔ La Despensa de Rosi — mermelada (RESERVED, 4 msgs)
  await Message.create({
    order_id: orderRoberto._id,
    sender_id: roberto._id,
    content: "Hola! ¿La mermelada de frutilla viene en pote o frasco de vidrio?",
  });
  await Message.create({
    order_id: orderRoberto._id,
    sender_id: rosi._id,
    content: "Hola Roberto! Es en frasco de vidrio, 440g. Muy buena, semi-artesanal.",
  });
  await Message.create({
    order_id: orderRoberto._id,
    sender_id: roberto._id,
    content: "Perfecto, paso mañana a la mañana.",
  });
  await Message.create({
    order_id: orderRoberto._id,
    sender_id: rosi._id,
    content: "Te la guardamos hasta las 12hs. ¡Hasta mañana!",
  });

  // Valentina ↔ La Despensa de Rosi — galletitas (DELIVERED, 5 msgs)
  await Message.create({
    order_id: orderValentina2._id,
    sender_id: valentina._id,
    content: "Hola de vuelta! Reservé las galletitas.",
  });
  await Message.create({
    order_id: orderValentina2._id,
    sender_id: rosi._id,
    content: "¡Hola Valentina! Qué bueno verte de vuelta. ¿Venís hoy?",
  });
  await Message.create({
    order_id: orderValentina2._id,
    sender_id: valentina._id,
    content: "Sí, a las 18hs.",
  });
  await Message.create({
    order_id: orderValentina2._id,
    sender_id: rosi._id,
    content: "Perfecto, te las tenemos listas.",
  });
  await Message.create({
    order_id: orderValentina2._id,
    sender_id: valentina._id,
    content: "¡Ya las retiré! Como siempre, excelente atención. Gracias Rosi.",
  });

  // Gonzalo ↔ Carnicería San José — hamburguesas (RESERVED, 6 msgs)
  await Message.create({
    order_id: orderGonzalo2._id,
    sender_id: gonzalo._id,
    content: "Hola! Vi las hamburguesas. ¿De qué carne son?",
  });
  await Message.create({
    order_id: orderGonzalo2._id,
    sender_id: pedro._id,
    content: "¡Hola Gonzalo! Son de paleta con chimichurri, 100% artesanales, 200g cada una.",
  });
  await Message.create({
    order_id: orderGonzalo2._id,
    sender_id: gonzalo._id,
    content: "¿Las puedo congelar si no las uso todas hoy?",
  });
  await Message.create({
    order_id: orderGonzalo2._id,
    sender_id: pedro._id,
    content: "Sí, sin problema. Aguantan 3 meses congeladas.",
  });
  await Message.create({
    order_id: orderGonzalo2._id,
    sender_id: gonzalo._id,
    content: "Genial. Paso esta tarde a retirarlas.",
  });
  await Message.create({
    order_id: orderGonzalo2._id,
    sender_id: pedro._id,
    content: "Perfecto, te esperamos. Estamos en Medrano 800, Almagro.",
  });

  // Diego ↔ Carnicería San José — peceto (DELIVERED, 4 msgs)
  await Message.create({
    order_id: orderDiego2._id,
    sender_id: diego._id,
    content: "Buenas! Ya retiré el peceto. Calidad top.",
  });
  await Message.create({
    order_id: orderDiego2._id,
    sender_id: pedro._id,
    content: "Gracias Diego! ¿Cómo lo preparaste?",
  });
  await Message.create({
    order_id: orderDiego2._id,
    sender_id: diego._id,
    content: "Al horno con papas. Quedó espectacular.",
  });
  await Message.create({
    order_id: orderDiego2._id,
    sender_id: pedro._id,
    content: "Qué bueno! Cuando quieras más, avisanos.",
  });

  // Sofía ↔ Mercado Todo — lentejas (RESERVED, 3 msgs)
  await Message.create({
    order_id: orderSofia2._id,
    sender_id: sofia._id,
    content: "Hola! ¿Las lentejas están bien conservadas?",
  });
  await Message.create({
    order_id: orderSofia2._id,
    sender_id: marta._id,
    content: "Hola Sofía! Sí, son de stock nuevo, vencen en 8 meses. Ideales para guiso.",
  });
  await Message.create({
    order_id: orderSofia2._id,
    sender_id: sofia._id,
    content: "Perfecto, paso mañana a la mañana.",
  });

  // Natalia ↔ Mercado Todo — yerba mate (DELIVERED, 4 msgs)
  await Message.create({
    order_id: orderNatalia2._id,
    sender_id: natalia._id,
    content: "Hola! Reservé la yerba, me quedé sin stock en casa jaja.",
  });
  await Message.create({
    order_id: orderNatalia2._id,
    sender_id: marta._id,
    content: "¡Hola Natalia! Jaja, la Rosamonte no puede faltar. ¿Pasás hoy?",
  });
  await Message.create({
    order_id: orderNatalia2._id,
    sender_id: natalia._id,
    content: "Sí, ahora en un rato.",
  });
  await Message.create({
    order_id: orderNatalia2._id,
    sender_id: marta._id,
    content: "Ya la tenemos lista. ¡Hasta ahora!",
  });

  // Lucas ↔ Pizzería Rey — fugazzeta (RESERVED, 5 msgs)
  await Message.create({
    order_id: orderLucas2._id,
    sender_id: lucas._id,
    content: "Hola! ¿La fugazzeta sale del horno a qué hora?",
  });
  await Message.create({
    order_id: orderLucas2._id,
    sender_id: carlos._id,
    content: "Hola Lucas! A las 18:30. Para las 20hs la tenés perfecta.",
  });
  await Message.create({
    order_id: orderLucas2._id,
    sender_id: lucas._id,
    content: "¿Tiene mucho queso?",
  });
  await Message.create({
    order_id: orderLucas2._id,
    sender_id: carlos._id,
    content: "Doble muzzarella y cebolla caramelizada. Una bomba garantizada.",
  });
  await Message.create({
    order_id: orderLucas2._id,
    sender_id: lucas._id,
    content: "Jaja perfecto! Paso a las 20hs entonces.",
  });

  // Ana ↔ Pizzería Rey — calzone (DELIVERED, 3 msgs)
  await Message.create({
    order_id: orderAna2._id,
    sender_id: ana._id,
    content: "Hola! Ya retiré el calzone. Estaba riquísimo.",
  });
  await Message.create({
    order_id: orderAna2._id,
    sender_id: carlos._id,
    content: "¡Gracias Ana! ¿Te gustó el relleno?",
  });
  await Message.create({
    order_id: orderAna2._id,
    sender_id: ana._id,
    content: "Sí, el de ricotta y espinaca está muy bueno. Vuelvo pronto.",
  });

  // Roberto ↔ La Esquina de Ernesto — mandarinas (RESERVED, 4 msgs)
  await Message.create({
    order_id: orderRoberto2._id,
    sender_id: roberto._id,
    content: "Hola! ¿Las mandarinas tienen cáscara fácil de pelar?",
  });
  await Message.create({
    order_id: orderRoberto2._id,
    sender_id: ernesto._id,
    content: "Hola Roberto! Sí, son tucumanas, muy jugosas y fáciles de pelar. Las favoritas del barrio.",
  });
  await Message.create({
    order_id: orderRoberto2._id,
    sender_id: roberto._id,
    content: "Paso esta tarde. ¿Hasta qué hora están?",
  });
  await Message.create({
    order_id: orderRoberto2._id,
    sender_id: ernesto._id,
    content: "Hasta las 19hs. ¡Te esperamos!",
  });

  console.log("✅  72 mensajes creados");

  // ===== NOTIFICACIONES (52) =====

  await Notification.create([
    // --- Notificaciones existentes ---
    {
      user_id: hornito._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Valentina Suárez reservó Bizcochos de grasa x15",
      reference_id: orderValentinaBizcochos._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: hornito._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Natalia Ferreyra reservó Chipá de almidón x10",
      reference_id: orderNataliaChipa._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: hornito._id,
      type: "RESERVATION_CANCELLED_BY_CONSUMER",
      title: "Reserva cancelada",
      message: "Gonzalo López canceló su reserva de Leche La Serenísima x6",
      reference_id: null,
      reference_type: null,
      read: false,
    },
    {
      user_id: hornito._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Valentina Suárez te envió un mensaje",
      reference_id: orderValentinaBizcochos._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: ernesto._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Gonzalo López reservó Peras Williams x5",
      reference_id: orderGonzaloPeras._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: ernesto._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Diego Hernández reservó Choclos tiernos x4",
      reference_id: orderDiegoChoclos._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: ernesto._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Gonzalo López te envió un mensaje",
      reference_id: orderGonzaloPeras._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: rosi._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Sofía Romero reservó Gaseosas surtidas x6",
      reference_id: orderSofiaGaseosas._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: valentina._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Panadería El Hornito te envió un mensaje",
      reference_id: orderValentinaBizcochos._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: diego._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Choclos tiernos x4 fue marcado como entregado",
      reference_id: orderDiegoChoclos._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: natalia._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Chipá de almidón x10 fue marcado como entregado",
      reference_id: orderNataliaChipa._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: gonzalo._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Frutería y Verdulería La Esquina de Ernesto te envió un mensaje",
      reference_id: orderGonzaloPeras._id,
      reference_type: "ORDER",
      read: true,
    },

    // --- Nuevas reservas (comercios reciben) ---
    {
      user_id: hornito._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Lucas Medina reservó Torta de chocolate 20cm",
      reference_id: orderLucas._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: hornito._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Ana Gómez reservó Medialunas de grasa x10",
      reference_id: orderAna._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: ernesto._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Julián Castro reservó Zanahorias baby 500g",
      reference_id: orderJulian._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: ernesto._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Paula Vargas reservó Manzanas rojas x6",
      reference_id: orderPaula._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: ernesto._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Roberto Silva reservó Mandarinas de Tucumán 2 kg",
      reference_id: orderRoberto2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: rosi._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Roberto Silva reservó Mermelada Liguria frutilla 440g",
      reference_id: orderRoberto._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: rosi._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Valentina Suárez reservó Galletitas Bagley surtidas x3 paquetes",
      reference_id: orderValentina2._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: pedro._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Gonzalo López reservó Hamburguesas caseras x4",
      reference_id: orderGonzalo2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: pedro._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Diego Hernández reservó Peceto en tiras 500g",
      reference_id: orderDiego2._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: marta._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Sofía Romero reservó Lentejas x500g",
      reference_id: orderSofia2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: marta._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Natalia Ferreyra reservó Yerba Mate Rosamonte 500g",
      reference_id: orderNatalia2._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: carlos._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Lucas Medina reservó Fugazzeta rellena 30cm",
      reference_id: orderLucas2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: carlos._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Ana Gómez reservó Calzone de ricotta y espinaca",
      reference_id: orderAna2._id,
      reference_type: "ORDER",
      read: true,
    },

    // --- Pedidos entregados (consumidores reciben) ---
    {
      user_id: ana._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Medialunas de grasa x10 fue marcado como entregado",
      reference_id: orderAna._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: paula._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Manzanas rojas x6 fue marcado como entregado",
      reference_id: orderPaula._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: valentina._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Galletitas Bagley surtidas x3 paquetes fue marcado como entregado",
      reference_id: orderValentina2._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: diego._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Peceto en tiras 500g fue marcado como entregado",
      reference_id: orderDiego2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: natalia._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Yerba Mate Rosamonte 500g fue marcado como entregado",
      reference_id: orderNatalia2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: ana._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Calzone de ricotta y espinaca fue marcado como entregado",
      reference_id: orderAna2._id,
      reference_type: "ORDER",
      read: true,
    },

    // --- Reserva cancelada (comercio recibe) ---
    {
      user_id: pedro._id,
      type: "RESERVATION_CANCELLED_BY_CONSUMER",
      title: "Reserva cancelada",
      message: "Paula Vargas canceló su reserva de Achuras surtidas x2 porciones",
      reference_id: null,
      reference_type: null,
      read: false,
    },

    // --- Nuevos mensajes (notificaciones recíprocas) ---
    {
      user_id: rosi._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Sofía Romero te envió un mensaje",
      reference_id: orderSofiaGaseosas._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: sofia._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Almacén La Despensa de Rosi te envió un mensaje",
      reference_id: orderSofiaGaseosas._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: hornito._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Lucas Medina te envió un mensaje",
      reference_id: orderLucas._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: lucas._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Panadería El Hornito te envió un mensaje",
      reference_id: orderLucas._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: ernesto._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Julián Castro te envió un mensaje",
      reference_id: orderJulian._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: julian._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Frutería y Verdulería La Esquina de Ernesto te envió un mensaje",
      reference_id: orderJulian._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: pedro._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Gonzalo López te envió un mensaje",
      reference_id: orderGonzalo2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: gonzalo._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Carnicería San José te envió un mensaje",
      reference_id: orderGonzalo2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: carlos._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Lucas Medina te envió un mensaje",
      reference_id: orderLucas2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: lucas._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Pizzería Rey te envió un mensaje",
      reference_id: orderLucas2._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: ernesto._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Roberto Silva te envió un mensaje",
      reference_id: orderRoberto2._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: roberto._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Frutería y Verdulería La Esquina de Ernesto te envió un mensaje",
      reference_id: orderRoberto2._id,
      reference_type: "ORDER",
      read: false,
    },

    // --- Publicaciones por vencer (cron job PUBLICATION_EXPIRING) ---
    {
      user_id: hornito._id,
      type: "PUBLICATION_EXPIRING",
      title: "Publicación por vencer",
      message: "Tu publicación 'Medialunas de manteca x12' vence en menos de 24hs",
      reference_id: pubMedialunas._id,
      reference_type: "PUBLICATION",
      read: false,
    },
    {
      user_id: ernesto._id,
      type: "PUBLICATION_EXPIRING",
      title: "Publicación por vencer",
      message: "Tu publicación 'Bananas de Ecuador 1 kg' vence en menos de 24hs",
      reference_id: pubBananas._id,
      reference_type: "PUBLICATION",
      read: true,
    },
    {
      user_id: rosi._id,
      type: "PUBLICATION_EXPIRING",
      title: "Publicación por vencer",
      message: "Tu publicación 'Yogur firme Ser natural x4' vence en menos de 24hs",
      reference_id: pubYogur._id,
      reference_type: "PUBLICATION",
      read: false,
    },
    {
      user_id: pedro._id,
      type: "PUBLICATION_EXPIRING",
      title: "Publicación por vencer",
      message: "Tu publicación 'Milanesas de nalga x4' vence en menos de 24hs",
      reference_id: pubMilanesas._id,
      reference_type: "PUBLICATION",
      read: false,
    },
    {
      user_id: marta._id,
      type: "PUBLICATION_EXPIRING",
      title: "Publicación por vencer",
      message: "Tu publicación 'Fideos Matarazzo surtidos x3 paquetes' vence en menos de 24hs",
      reference_id: pubFideos._id,
      reference_type: "PUBLICATION",
      read: true,
    },
    {
      user_id: carlos._id,
      type: "PUBLICATION_EXPIRING",
      title: "Publicación por vencer",
      message: "Tu publicación 'Pizza napolitana 34cm' vence en menos de 24hs",
      reference_id: pubPizzaNapo._id,
      reference_type: "PUBLICATION",
      read: false,
    },

    // --- Publicaciones vencidas (cron job PUBLICATION_EXPIRED) ---
    {
      user_id: hornito._id,
      type: "PUBLICATION_EXPIRED",
      title: "Publicación vencida",
      message: "Tu publicación 'Cuernitos de vainilla x8' ha vencido",
      reference_id: pubCuernitos._id,
      reference_type: "PUBLICATION",
      read: true,
    },
    {
      user_id: pedro._id,
      type: "PUBLICATION_EXPIRED",
      title: "Publicación vencida",
      message: "Tu publicación 'Vacío premium 600g' ha vencido",
      reference_id: pubVacio._id,
      reference_type: "PUBLICATION",
      read: false,
    },
  ]);

  console.log("✅  52 notificaciones creadas");

  // ===== FAVORITOS (36) =====
  await Favorite.create([
    // Valentina (5)
    { user_id: valentina._id, publication_id: pubMedialunas._id },
    { user_id: valentina._id, publication_id: pubBananas._id },
    { user_id: valentina._id, publication_id: pubTortaChocolate._id },
    { user_id: valentina._id, publication_id: pubMermelada._id },
    { user_id: valentina._id, publication_id: pubPizzaNapo._id },
    // Gonzalo (6)
    { user_id: gonzalo._id, publication_id: pubTomates._id },
    { user_id: gonzalo._id, publication_id: pubLeche._id },
    { user_id: gonzalo._id, publication_id: pubFacturas._id },
    { user_id: gonzalo._id, publication_id: pubHamburguesas._id },
    { user_id: gonzalo._id, publication_id: pubFideos._id },
    { user_id: gonzalo._id, publication_id: pubYerba._id },
    // Sofia (4)
    { user_id: sofia._id, publication_id: pubBananas._id },
    { user_id: sofia._id, publication_id: pubGaseosas._id },
    { user_id: sofia._id, publication_id: pubLentejas._id },
    { user_id: sofia._id, publication_id: pubCalzone._id },
    // Diego (4)
    { user_id: diego._id, publication_id: pubChoclos._id },
    { user_id: diego._id, publication_id: pubPeceto._id },
    { user_id: diego._id, publication_id: pubMilanesas._id },
    { user_id: diego._id, publication_id: pubHamburguesas._id },
    // Natalia (4)
    { user_id: natalia._id, publication_id: pubChipa._id },
    { user_id: natalia._id, publication_id: pubQueso._id },
    { user_id: natalia._id, publication_id: pubFugazzeta._id },
    { user_id: natalia._id, publication_id: pubEmpanadas._id },
    // Lucas (3)
    { user_id: lucas._id, publication_id: pubTortaChocolate._id },
    { user_id: lucas._id, publication_id: pubBizcochos._id },
    { user_id: lucas._id, publication_id: pubPanMiga._id },
    // Ana (3)
    { user_id: ana._id, publication_id: pubGalletitas._id },
    { user_id: ana._id, publication_id: pubMedialunasGrasa._id },
    { user_id: ana._id, publication_id: pubPizzaNapo._id },
    // Julian (3)
    { user_id: julian._id, publication_id: pubZanahorias._id },
    { user_id: julian._id, publication_id: pubUvas._id },
    { user_id: julian._id, publication_id: pubChoclos._id },
    // Paula (3)
    { user_id: paula._id, publication_id: pubManzanas._id },
    { user_id: paula._id, publication_id: pubAceite._id },
    { user_id: paula._id, publication_id: pubMandarinas._id },
    // Roberto (4)
    { user_id: roberto._id, publication_id: pubMermelada._id },
    { user_id: roberto._id, publication_id: pubLentejas._id },
    { user_id: roberto._id, publication_id: pubAtun._id },
    { user_id: roberto._id, publication_id: pubMandarinas._id },
  ]);

  console.log("✅  39 favoritos creados");

  await mongoose.disconnect();
  console.log("🔌  Desconectado");
  console.log("");
  console.log("🎉  Seed completo! — contraseña: Test1234 (todos), Admin123 (admin)");
  console.log("");
  console.log("   Admin:");
  console.log("     admin@balanzen.com");
  console.log("");
  console.log("   Comercios con dirección:");
  console.log("     facundo@elhornito.com");
  console.log("     ernesto@verduleria.com");
  console.log("     rosi@ladespensa.com");
  console.log("     pedro@carniceria.com");
  console.log("     marta@mercadotodo.com");
  console.log("     carlos@pizzeriarey.com");
  console.log("");
  console.log("   Comercio sin dirección:");
  console.log("     lucia@lacerveceria.com");
  console.log("");
  console.log("   Consumidores con dirección:");
  console.log("     valentina@mail.com");
  console.log("     gonzalo@mail.com");
  console.log("     sofia@mail.com");
  console.log("     diego@mail.com");
  console.log("     natalia@mail.com");
  console.log("     lucas@mail.com");
  console.log("     ana@mail.com");
  console.log("     julian@mail.com");
  console.log("     paula@mail.com");
  console.log("     roberto@mail.com");
  console.log("");
  console.log("   Consumidores sin dirección:");
  console.log("     camila@mail.com");
  console.log("     martin@mail.com");
};

seed().catch((err) => {
  console.error("❌ Error en seed:", err.message);
  process.exit(1);
});
