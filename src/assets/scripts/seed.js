import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
      if (!seedPublicIds.has(resource.public_id)) toDelete.push(resource.public_id);
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
    catMap[name] = (await Category.create({ name }))._id;
  }
  console.log("✅  7 categorías creadas");

  const password = await hashPassword("Test1234");

  // --- Helpers ---
  const mkComercio = (data) =>
    User.create({ ...data, role: "COMERCIO", password, photo_url: photoComericio });

  const mkConsumidor = (data) =>
    User.create({ ...data, role: "CONSUMIDOR", password, photo_url: photoConsumidor });

  const mkAddr = (userId, street, number, zone, lat, lng) =>
    Address.create({
      user_id: userId,
      formatted_address: `${street} ${number}, ${zone}, CABA`,
      street,
      number,
      city: "CABA",
      province: "Buenos Aires",
      lat,
      lng,
    });

  const mkMsgs = (orderId, pairs) =>
    Message.create(
      pairs.map(([senderId, content]) => ({ order_id: orderId, sender_id: senderId, content }))
    );

  const mkNotif = (userId, type, title, message, refId = null, refType = null, read = false) => ({
    user_id: userId,
    type,
    title,
    message,
    reference_id: refId,
    reference_type: refType,
    read,
  });

  // ===== COMERCIOS (7) =====

  const hornito = await mkComercio({
    email: "facundo@elhornito.com",
    first_name: "Facundo",
    last_name: "Rossi",
    phone: "1144556677",
    dni: "28111111",
    business_name: "Panadería El Hornito",
    cuit: "20281111112",
  });
  const hornitAddr1 = await mkAddr(
    hornito._id,
    "Av. Corrientes",
    "2468",
    "Balvanera",
    -34.6068,
    -58.4033
  );
  await mkAddr(hornito._id, "Av. Callao", "900", "Balvanera", -34.6052, -58.3924);
  await mkAddr(hornito._id, "Av. Córdoba", "1500", "Buenos Aires", -34.5997, -58.3912);
  await selectAddress(hornito._id, hornitAddr1._id);

  const ernesto = await mkComercio({
    email: "ernesto@verduleria.com",
    first_name: "Ernesto",
    last_name: "Villalba",
    phone: "1133445566",
    dni: "26222222",
    business_name: "Frutería y Verdulería La Esquina de Ernesto",
    cuit: "20262222223",
  });
  const ernestoAddr1 = await mkAddr(
    ernesto._id,
    "Balcarce",
    "460",
    "San Telmo",
    -34.6198,
    -58.3728
  );
  await mkAddr(ernesto._id, "Chile", "800", "San Telmo", -34.6227, -58.3698);
  await mkAddr(ernesto._id, "Av. Independencia", "1200", "San Telmo", -34.6247, -58.3842);
  await selectAddress(ernesto._id, ernestoAddr1._id);

  const rosi = await mkComercio({
    email: "rosi@ladespensa.com",
    first_name: "Rosario",
    last_name: "Medina",
    phone: "1122334455",
    dni: "29333333",
    business_name: "Almacén La Despensa de Rosi",
    cuit: "27293333334",
  });
  const rosiAddr1 = await mkAddr(
    rosi._id,
    "Av. Rivadavia",
    "5600",
    "Caballito",
    -34.6178,
    -58.4362
  );
  await mkAddr(rosi._id, "Av. Acoyte", "300", "Caballito", -34.6158, -58.4381);
  await mkAddr(rosi._id, "Rojas", "500", "Caballito", -34.6201, -58.4472);
  await selectAddress(rosi._id, rosiAddr1._id);

  await mkComercio({
    email: "lucia@lacerveceria.com",
    first_name: "Lucía",
    last_name: "Paredes",
    phone: "1155443322",
    dni: "31444444",
    business_name: "La Cervecería Artesanal",
    cuit: "27314444445",
  });

  const pedro = await mkComercio({
    email: "pedro@carniceria.com",
    first_name: "Pedro",
    last_name: "García",
    phone: "1144332211",
    dni: "27888888",
    business_name: "Carnicería San José",
    cuit: "20278888889",
  });
  const pedroAddr1 = await mkAddr(pedro._id, "Medrano", "800", "Almagro", -34.6117, -58.4177);
  await mkAddr(pedro._id, "Av. Díaz Vélez", "3900", "Caballito", -34.6201, -58.4334);
  await selectAddress(pedro._id, pedroAddr1._id);

  const marta = await mkComercio({
    email: "marta@mercadotodo.com",
    first_name: "Marta",
    last_name: "Domínguez",
    phone: "1133221100",
    dni: "30999999",
    business_name: "Mercado Todo",
    cuit: "27309999993",
  });
  const martaAddr1 = await mkAddr(marta._id, "Av. Boedo", "700", "Boedo", -34.6287, -58.4122);
  await mkAddr(marta._id, "Estados Unidos", "2200", "Boedo", -34.6355, -58.4013);
  await selectAddress(marta._id, martaAddr1._id);

  const carlos = await mkComercio({
    email: "carlos@pizzeriarey.com",
    first_name: "Carlos",
    last_name: "Reyes",
    phone: "1122110099",
    dni: "32101010",
    business_name: "Pizzería Rey",
    cuit: "20321010102",
  });
  const carlosAddr1 = await mkAddr(
    carlos._id,
    "Triunvirato",
    "2200",
    "Villa Urquiza",
    -34.5889,
    -58.4922
  );
  await mkAddr(carlos._id, "Av. Federico Lacroze", "4200", "Villa Urquiza", -34.5752, -58.4729);
  await selectAddress(carlos._id, carlosAddr1._id);

  console.log("✅  7 comercios creados (6 con dirección, 1 sin dirección)");

  // ===== CONSUMIDORES (12) =====

  const valentina = await mkConsumidor({
    email: "valentina@mail.com",
    first_name: "Valentina",
    last_name: "Suárez",
    phone: "1155667788",
    dni: "37111111",
  });
  const valAddr1 = await mkAddr(valentina._id, "Thames", "1500", "Palermo", -34.5886, -58.4271);
  await mkAddr(valentina._id, "Av. Corrientes", "4200", "Villa Crespo", -34.5988, -58.4398);
  await mkAddr(valentina._id, "Guatemala", "4700", "Palermo", -34.5832, -58.4239);
  await mkAddr(valentina._id, "Malabia", "1800", "Palermo", -34.5863, -58.4306);
  await selectAddress(valentina._id, valAddr1._id);

  const gonzalo = await mkConsumidor({
    email: "gonzalo@mail.com",
    first_name: "Gonzalo",
    last_name: "López",
    phone: "1166778899",
    dni: "38222222",
  });
  const gonzAddr1 = await mkAddr(gonzalo._id, "Cabildo", "2000", "Belgrano", -34.5617, -58.4583);
  await mkAddr(gonzalo._id, "Av. del Libertador", "6000", "Núñez", -34.5463, -58.4641);
  await mkAddr(gonzalo._id, "Juramento", "2400", "Belgrano", -34.5591, -58.4612);
  await mkAddr(gonzalo._id, "Virrey del Pino", "2800", "Belgrano", -34.5547, -58.4573);
  await selectAddress(gonzalo._id, gonzAddr1._id);

  const sofia = await mkConsumidor({
    email: "sofia@mail.com",
    first_name: "Sofía",
    last_name: "Romero",
    phone: "1177889900",
    dni: "39333333",
  });
  const sofiaAddr1 = await mkAddr(sofia._id, "Defensa", "800", "San Telmo", -34.6224, -58.3712);
  await mkAddr(sofia._id, "Av. Regimiento Patricios", "1200", "Barracas", -34.6391, -58.3827);
  await mkAddr(sofia._id, "Humberto I", "1000", "San Telmo", -34.6261, -58.3692);
  await selectAddress(sofia._id, sofiaAddr1._id);

  const diego = await mkConsumidor({
    email: "diego@mail.com",
    first_name: "Diego",
    last_name: "Hernández",
    phone: "1188990011",
    dni: "40444444",
  });
  const diegoAddr1 = await mkAddr(diego._id, "Av. Rivadavia", "7000", "Flores", -34.6295, -58.4613);
  await mkAddr(diego._id, "Av. Acoyte", "100", "Caballito", -34.6158, -58.4381);
  await mkAddr(diego._id, "Membrillar", "2000", "Flores", -34.6318, -58.4727);
  await selectAddress(diego._id, diegoAddr1._id);

  const natalia = await mkConsumidor({
    email: "natalia@mail.com",
    first_name: "Natalia",
    last_name: "Ferreyra",
    phone: "1199001122",
    dni: "41555555",
  });
  const nataliaAddr1 = await mkAddr(
    natalia._id,
    "Av. Alvear",
    "1800",
    "Recoleta",
    -34.5858,
    -58.3928
  );
  await mkAddr(natalia._id, "Libertad", "500", "Retiro", -34.5889, -58.3742);
  await mkAddr(natalia._id, "Juncal", "1600", "Recoleta", -34.5872, -58.3851);
  await selectAddress(natalia._id, nataliaAddr1._id);

  await mkConsumidor({
    email: "camila@mail.com",
    first_name: "Camila",
    last_name: "Torres",
    phone: "1111223344",
    dni: "42666666",
  });
  await mkConsumidor({
    email: "martin@mail.com",
    first_name: "Martín",
    last_name: "Gimenez",
    phone: "1122334400",
    dni: "43777777",
  });

  const lucas = await mkConsumidor({
    email: "lucas@mail.com",
    first_name: "Lucas",
    last_name: "Medina",
    phone: "1111009988",
    dni: "44121212",
  });
  const lucasAddr1 = await mkAddr(lucas._id, "Av. Santa Fe", "1200", "Retiro", -34.5937, -58.3812);
  await mkAddr(lucas._id, "Av. Callao", "200", "San Nicolás", -34.6041, -58.3824);
  await selectAddress(lucas._id, lucasAddr1._id);

  const ana = await mkConsumidor({
    email: "ana@mail.com",
    first_name: "Ana",
    last_name: "Gómez",
    phone: "1100998877",
    dni: "45131313",
  });
  const anaAddr1 = await mkAddr(ana._id, "Olleros", "1800", "Palermo", -34.5739, -58.4324);
  await mkAddr(ana._id, "Av. Cabildo", "600", "Palermo", -34.5742, -58.4386);
  await selectAddress(ana._id, anaAddr1._id);

  const julian = await mkConsumidor({
    email: "julian@mail.com",
    first_name: "Julián",
    last_name: "Castro",
    phone: "1199887766",
    dni: "46141414",
  });
  const julianAddr1 = await mkAddr(
    julian._id,
    "Av. Gaona",
    "1400",
    "Caballito",
    -34.6189,
    -58.4501
  );
  await mkAddr(julian._id, "Boyacá", "1500", "Caballito", -34.6177, -58.4502);
  await selectAddress(julian._id, julianAddr1._id);

  const paula = await mkConsumidor({
    email: "paula@mail.com",
    first_name: "Paula",
    last_name: "Vargas",
    phone: "1188776655",
    dni: "47151515",
  });
  const paulaAddr1 = await mkAddr(paula._id, "Av. San Juan", "2000", "Boedo", -34.6321, -58.4088);
  await mkAddr(paula._id, "Av. Independencia", "3200", "Boedo", -34.6299, -58.4171);
  await selectAddress(paula._id, paulaAddr1._id);

  const roberto = await mkConsumidor({
    email: "roberto@mail.com",
    first_name: "Roberto",
    last_name: "Silva",
    phone: "1177665544",
    dni: "36161616",
  });
  const robertoAddr1 = await mkAddr(
    roberto._id,
    "Av. Boyacá",
    "1000",
    "Villa del Parque",
    -34.6072,
    -58.5003
  );
  await mkAddr(roberto._id, "Av. San Martín", "3800", "Villa del Parque", -34.6083, -58.4978);
  await selectAddress(roberto._id, robertoAddr1._id);

  console.log("✅  12 consumidores creados (10 con dirección, 2 sin dirección)");

  // ===== PUBLICACIONES =====

  // --- El Hornito — Panadería (12) ---
  const pubMedialunas = await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Medialunas de manteca x12",
    description:
      "Docena de medialunas recién horneadas, sobrantes del turno mañana. Perfectas para el desayuno o merienda.",
    original_price: 2800,
    final_price: 840,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  const pubFacturas = await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Facturas surtidas x8 — vigilantes y cañoncitos",
    description:
      "Surtido del día: vigilantes de membrillo, cañoncitos de dulce de leche y libritos de crema pastelera.",
    original_price: 3200,
    final_price: 960,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Pan de campo artesanal — DONACIÓN",
    description:
      "Pan de campo grande (800g) de masa madre, sobrante del día. Lo donamos antes de tirarlo.",
    original_price: 0,
    final_price: 0,
    is_donation: true,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  const pubBizcochos = await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Bizcochos de grasa x15",
    description: "Bizcochos recién salidos del horno, bien crocantes. Lote de cierre, retiro hoy.",
    original_price: 2400,
    final_price: 960,
    expiry_date: days(1),
    status: "RESERVED",
  });
  const pubChipa = await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Chipá de almidón x10",
    description:
      "Chipá crocantes rellenos con queso, elaborados con almidón de mandioca. Lote de cierre.",
    original_price: 1500,
    final_price: 600,
    expiry_date: days(-1),
    status: "DELIVERED",
  });
  await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Torta de ricotta y dulce de leche",
    description: "Torta casera 28cm. Venció ayer.",
    original_price: 4500,
    final_price: 1800,
    expiry_date: days(-2),
    status: "EXPIRED",
  });
  await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Alfajores de maicena x6 — DONACIÓN",
    description: "Alfajores caseros con dulce de leche. Donación cancelada.",
    original_price: 0,
    final_price: 0,
    is_donation: true,
    expiry_date: days(-3),
    status: "CANCELLED",
    deleted_at: new Date(),
  });
  const pubPanMiga = await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Pan de miga blanco x2 lonjitas",
    description:
      "Pan de miga blanco en lonjitas, ideal para sandwiches. Sobrante del turno tarde, muy fresco.",
    original_price: 1800,
    final_price: 720,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Tapas de empanada x24",
    description:
      "Tapas para empanadas al horno y fritas, lote de cierre. Congelan perfecto si no las usás hoy.",
    original_price: 1200,
    final_price: 480,
    expiry_date: days(2),
    status: "ACTIVE",
  });
  const pubTortaChocolate = await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Torta de chocolate 20cm",
    description: "Torta húmeda de chocolate con ganache. Hecha hoy, retiro antes de las 20hs.",
    original_price: 5500,
    final_price: 2200,
    expiry_date: days(1),
    status: "RESERVED",
  });
  const pubMedialunasGrasa = await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Medialunas de grasa x10",
    description:
      "Medialunas de grasa bien hojaldradas, recién salidas del horno. Lote del turno tarde.",
    original_price: 2200,
    final_price: 880,
    expiry_date: days(-1),
    status: "DELIVERED",
  });
  const pubCuernitos = await Publication.create({
    commerce_id: hornito._id,
    category_id: catMap["Panificados"],
    title: "Cuernitos de vainilla x8",
    description: "Cuernitos rellenos con crema de vainilla. Vencieron ayer.",
    original_price: 1600,
    final_price: 640,
    expiry_date: days(-2),
    status: "EXPIRED",
  });
  console.log("✅  12 publicaciones El Hornito");

  // --- La Esquina de Ernesto — Frutería y Verdulería (10) ---
  const pubBananas = await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Frutas"],
    title: "Bananas de Ecuador 1 kg",
    description:
      "Bananas maduras, ideales para consumo inmediato o licuados. No se van a esperar más.",
    original_price: 800,
    final_price: 320,
    expiry_date: days(2),
    status: "ACTIVE",
  });
  const pubTomates = await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Verduras"],
    title: "Tomates perita 800g",
    description: "Tomates maduros al punto, perfectos para tuco casero o ensalada. Compra de hoy.",
    original_price: 700,
    final_price: 280,
    expiry_date: days(2),
    status: "ACTIVE",
  });
  await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Frutas"],
    title: "Naranjas de jugo 2 kg",
    description:
      "Naranjas dulces, mucha pulpa y poca cáscara. Perfectas para jugo fresco de la mañana.",
    original_price: 1200,
    final_price: 480,
    expiry_date: days(3),
    status: "ACTIVE",
  });
  const pubPeras = await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Frutas"],
    title: "Peras Williams x5",
    description:
      "Peras en su punto justo de madurez. Ideales para consumir hoy o mañana, no aguantan más.",
    original_price: 600,
    final_price: 240,
    expiry_date: days(2),
    status: "RESERVED",
  });
  const pubChoclos = await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Verduras"],
    title: "Choclos tiernos x4",
    description:
      "Choclos de cosecha local, bien tiernos. Ideales para hervir, hacer a la parrilla o en guiso.",
    original_price: 500,
    final_price: 200,
    expiry_date: days(-1),
    status: "DELIVERED",
  });
  await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Verduras"],
    title: "Espinacas frescas — DONACIÓN",
    description:
      "Atado de espinacas frescas del día. Las donamos antes de que venzan. Ideal para tarta o saltear con ajo.",
    original_price: 0,
    final_price: 0,
    is_donation: true,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  const pubUvas = await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Frutas"],
    title: "Uvas negras 1 kg",
    description:
      "Uvas negras sin semilla, muy dulces. Llegaron hoy, hay que consumirlas en los próximos 2 días.",
    original_price: 1400,
    final_price: 560,
    expiry_date: days(2),
    status: "ACTIVE",
  });
  const pubZanahorias = await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Verduras"],
    title: "Zanahorias baby 500g",
    description:
      "Zanahorias baby peladas y listas para consumir. Ideales para jugo, ensalada o snack saludable.",
    original_price: 900,
    final_price: 360,
    expiry_date: days(2),
    status: "RESERVED",
  });
  const pubManzanas = await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Frutas"],
    title: "Manzanas rojas x6",
    description: "Manzanas rojas de primera, bien firmes y dulces. Compra de esta mañana.",
    original_price: 1100,
    final_price: 440,
    expiry_date: days(-1),
    status: "DELIVERED",
  });
  const pubMandarinas = await Publication.create({
    commerce_id: ernesto._id,
    category_id: catMap["Frutas"],
    title: "Mandarinas de Tucumán 2 kg",
    description:
      "Mandarinas muy jugosas y fáciles de pelar. Las favoritas del barrio. Hay para hoy y mañana.",
    original_price: 1600,
    final_price: 640,
    expiry_date: days(2),
    status: "RESERVED",
  });
  console.log("✅  10 publicaciones La Esquina de Ernesto");

  // --- La Despensa de Rosi — Almacén (9) ---
  const pubLeche = await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Lácteos"],
    title: "Leche La Serenísima entera x6 sachets",
    description:
      "Sachets de 1L de leche entera. Vencen en 3 días. Ideal para familia numerosa o jardín.",
    original_price: 4200,
    final_price: 2520,
    expiry_date: days(3),
    status: "ACTIVE",
  });
  const pubYogur = await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Lácteos"],
    title: "Yogur firme Ser natural x4",
    description: "Yogur entero sin azúcar, 200g cada uno. Vencen en 4 días.",
    original_price: 2800,
    final_price: 1400,
    expiry_date: days(4),
    status: "ACTIVE",
  });
  const pubQueso = await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Lácteos"],
    title: "Queso cremoso La Paulina 400g",
    description: "En horma, apto para untar o derretir. Vence en 5 días. Excelente para tostadas.",
    original_price: 3200,
    final_price: 1600,
    expiry_date: days(5),
    status: "ACTIVE",
  });
  const pubGaseosas = await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Bebidas"],
    title: "Gaseosas surtidas x6 (Coca-Cola y 7UP)",
    description:
      "Latas 350ml de Coca-Cola y 7UP. Vencen este fin de semana. Precio para llevar todo el lote.",
    original_price: 4800,
    final_price: 2400,
    expiry_date: days(4),
    status: "RESERVED",
  });
  await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Lácteos"],
    title: "Dulce de leche Sancor 400g",
    description:
      "Reposite de stock, vence la próxima semana. Dulce de leche repostero, ideal para facturas o tortas.",
    original_price: 1800,
    final_price: 900,
    expiry_date: days(7),
    status: "ACTIVE",
  });
  await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Lácteos"],
    title: "Manteca Magnolia 200g",
    description:
      "Manteca sin sal, vence en 6 días. Ideal para repostería o para untar. Stock de reposite.",
    original_price: 1400,
    final_price: 700,
    expiry_date: days(6),
    status: "ACTIVE",
  });
  const pubMermelada = await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Otros"],
    title: "Mermelada Liguria frutilla 440g",
    description: "Frasco de vidrio, tapa nueva. Mermelada artesanal de frutilla. Vence en 10 días.",
    original_price: 2200,
    final_price: 1100,
    expiry_date: days(4),
    status: "RESERVED",
  });
  const pubGalletitas = await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Otros"],
    title: "Galletitas Bagley surtidas x3 paquetes",
    description:
      "Tres paquetes variados: Lincoln, Oreo y Pepitos. Vencen en 5 días, en perfectas condiciones.",
    original_price: 3600,
    final_price: 1440,
    expiry_date: days(-1),
    status: "DELIVERED",
  });
  const pubAceite = await Publication.create({
    commerce_id: rosi._id,
    category_id: catMap["Otros"],
    title: "Aceite de girasol Cocinero 900ml",
    description: "Botella entera, stock de reposite. Vence en 2 semanas. Ideal para cocina diaria.",
    original_price: 2600,
    final_price: 1300,
    expiry_date: days(14),
    status: "ACTIVE",
  });
  console.log("✅  9 publicaciones La Despensa de Rosi");

  // --- Carnicería San José — Pedro (8) ---
  const pubMilanesas = await Publication.create({
    commerce_id: pedro._id,
    category_id: catMap["Carnes"],
    title: "Milanesas de nalga x4",
    description:
      "Milanesas de nalga finas, listas para rebozar o ya rebozadas según preferencia. Frescas de hoy.",
    original_price: 4800,
    final_price: 2400,
    expiry_date: days(2),
    status: "ACTIVE",
  });
  await Publication.create({
    commerce_id: pedro._id,
    category_id: catMap["Carnes"],
    title: "Chorizo criollo x6",
    description:
      "Chorizos criollos artesanales, mezcla de cerdo y vacuno con especias. Frescos de hoy.",
    original_price: 3600,
    final_price: 1800,
    expiry_date: days(2),
    status: "ACTIVE",
  });
  const pubHamburguesas = await Publication.create({
    commerce_id: pedro._id,
    category_id: catMap["Carnes"],
    title: "Hamburguesas caseras x4",
    description:
      "Hamburguesas de paleta con chimichurri, 200g cada una. Artesanales, sin conservantes. Congelan perfecto.",
    original_price: 4200,
    final_price: 2100,
    expiry_date: days(2),
    status: "RESERVED",
  });
  await Publication.create({
    commerce_id: pedro._id,
    category_id: catMap["Carnes"],
    title: "Pollo trozado 1.2 kg",
    description:
      "Pollo fresco trozado en cuartos. Compra de hoy, sin freezar. Listo para horno o parrilla.",
    original_price: 3800,
    final_price: 1900,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  const pubPeceto = await Publication.create({
    commerce_id: pedro._id,
    category_id: catMap["Carnes"],
    title: "Peceto en tiras 500g",
    description:
      "Peceto de primera calidad cortado en tiras finas. Ideal para salteado o tiras de carne.",
    original_price: 3200,
    final_price: 1600,
    expiry_date: days(-1),
    status: "DELIVERED",
  });
  const pubAchuras = await Publication.create({
    commerce_id: pedro._id,
    category_id: catMap["Carnes"],
    title: "Achuras surtidas x2 porciones",
    description:
      "Dos porciones de achuras: chinchulines y riñones frescos. Ideales para parrilla del fin de semana.",
    original_price: 2800,
    final_price: 1400,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  const pubVacio = await Publication.create({
    commerce_id: pedro._id,
    category_id: catMap["Carnes"],
    title: "Vacío premium 600g",
    description: "Corte premium. Venció ayer, no se llegó a vender.",
    original_price: 5200,
    final_price: 2600,
    expiry_date: days(-2),
    status: "EXPIRED",
  });
  await Publication.create({
    commerce_id: pedro._id,
    category_id: catMap["Carnes"],
    title: "Costillas de cerdo 800g",
    description:
      "Costillar de cerdo fresco, bien carnoso. Perfecto para asar o hacer al horno con papas.",
    original_price: 4400,
    final_price: 2200,
    expiry_date: days(2),
    status: "ACTIVE",
  });
  console.log("✅  8 publicaciones Carnicería San José");

  // --- Marta — 7 publicaciones ---
  const pubFideos = await Publication.create({
    commerce_id: marta._id,
    category_id: catMap["Otros"],
    title: "Fideos Matarazzo surtidos x3 paquetes",
    description:
      "Tres paquetes 500g: tallarines, moñitos y espaguetis. Vencen en 2 semanas. Stock de reposite.",
    original_price: 3600,
    final_price: 1800,
    expiry_date: days(14),
    status: "ACTIVE",
  });
  await Publication.create({
    commerce_id: marta._id,
    category_id: catMap["Otros"],
    title: "Arroz Molinos Río 1 kg",
    description: "Arroz largo fino, vence en 3 semanas. Bolsa sellada, en perfectas condiciones.",
    original_price: 1800,
    final_price: 900,
    expiry_date: days(21),
    status: "ACTIVE",
  });
  const pubLentejas = await Publication.create({
    commerce_id: marta._id,
    category_id: catMap["Otros"],
    title: "Lentejas x500g",
    description: "Lentejas pardas secas, vencen en 8 meses. Bolsa nueva. Ideal para guiso o sopa.",
    original_price: 1600,
    final_price: 800,
    expiry_date: days(5),
    status: "RESERVED",
  });
  await Publication.create({
    commerce_id: marta._id,
    category_id: catMap["Otros"],
    title: "Aceite de maíz Natura 900ml",
    description:
      "Botella entera sin abrir. Vence en 1 mes. Reposite de stock, ideal para fritura o aderezo.",
    original_price: 2800,
    final_price: 1400,
    expiry_date: days(30),
    status: "ACTIVE",
  });
  const pubYerba = await Publication.create({
    commerce_id: marta._id,
    category_id: catMap["Otros"],
    title: "Yerba Mate Rosamonte 500g",
    description:
      "Paquete nuevo sin abrir. Vence en 6 meses. Stock de reposite, ideal para el mate diario.",
    original_price: 2200,
    final_price: 1100,
    expiry_date: days(-1),
    status: "DELIVERED",
  });
  const pubAtun = await Publication.create({
    commerce_id: marta._id,
    category_id: catMap["Otros"],
    title: "Lata de atún La Campagnola x4",
    description:
      "Cuatro latas de atún al natural 170g. Vencen en 10 días. Excelente para ensaladas o sandwiches.",
    original_price: 3200,
    final_price: 1600,
    expiry_date: days(10),
    status: "ACTIVE",
  });
  await Publication.create({
    commerce_id: marta._id,
    category_id: catMap["Otros"],
    title: "Azúcar La Merced 1 kg",
    description: "Bolsa de azúcar blanca 1kg. Vence en 1 año. Reposite a precio de liquidación.",
    original_price: 1400,
    final_price: 700,
    expiry_date: days(60),
    status: "ACTIVE",
  });
  console.log("✅  7 publicaciones Mercado Todo");

  // --- Pizzería Rey — Carlos (6) ---
  const pubPizzaNapo = await Publication.create({
    commerce_id: carlos._id,
    category_id: catMap["Panificados"],
    title: "Pizza napolitana 34cm",
    description:
      "Pizza napolitana grande con muzzarella, tomate, ajo y albahaca. Sobrante del mediodía.",
    original_price: 6800,
    final_price: 2720,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  const pubFugazzeta = await Publication.create({
    commerce_id: carlos._id,
    category_id: catMap["Panificados"],
    title: "Fugazzeta rellena 30cm",
    description:
      "Fugazzeta con doble muzzarella y cebolla caramelizada. Sale del horno a las 18:30, retiro antes de las 21hs.",
    original_price: 7500,
    final_price: 3000,
    expiry_date: days(1),
    status: "RESERVED",
  });
  const pubEmpanadas = await Publication.create({
    commerce_id: carlos._id,
    category_id: catMap["Panificados"],
    title: "Empanadas de carne x12",
    description:
      "Docena de empanadas al horno de carne cortada a cuchillo, bien jugosas. Sobrante del turno mediodía.",
    original_price: 8400,
    final_price: 3360,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  const pubCalzone = await Publication.create({
    commerce_id: carlos._id,
    category_id: catMap["Panificados"],
    title: "Calzone de ricotta y espinaca",
    description:
      "Calzone relleno con ricotta, espinaca y muzzarella. Excelente combinación, sobrante del mediodía.",
    original_price: 5600,
    final_price: 2240,
    expiry_date: days(-1),
    status: "DELIVERED",
  });
  await Publication.create({
    commerce_id: carlos._id,
    category_id: catMap["Panificados"],
    title: "Media docena empanadas de humita",
    description:
      "Seis empanadas de humita al horno, bien cremosas. Sobrante del turno. Listo para llevar.",
    original_price: 4200,
    final_price: 1680,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  await Publication.create({
    commerce_id: carlos._id,
    category_id: catMap["Panificados"],
    title: "Pizza de mozzarella 34cm — DONACIÓN",
    description:
      "Pizza entera de muzzarella, sobrante del cierre. La donamos antes de tirarla. Retiro antes de las 22hs.",
    original_price: 0,
    final_price: 0,
    is_donation: true,
    expiry_date: days(1),
    status: "ACTIVE",
  });
  console.log("✅  6 publicaciones Pizzería Rey");

  // ===== ÓRDENES (20) =====

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

  await mkMsgs(orderValentinaBizcochos._id, [
    [valentina._id, "Hola! Paso a buscar los bizcochos hoy a las 17hs, está bien?"],
    [
      hornito._id,
      "Buenas Valentina! Sí claro, te los tengo guardados hasta las 20hs. Estamos en Corrientes 2468.",
    ],
    [valentina._id, "Perfecto, muchas gracias! Son para el desayuno de mañana."],
    [hornito._id, "Excelente! Fresquitos van a estar. Cualquier cosa avisame."],
    [valentina._id, "Dale, en un rato estoy."],
  ]);
  await mkMsgs(orderGonzaloPeras._id, [
    [gonzalo._id, "Buen día! ¿A qué hora cierran hoy para pasar a retirar las peras?"],
    [
      ernesto._id,
      "Buenas Gonzalo! Hoy cerramos a las 19hs. Pasá cuando quieras, estamos en Balcarce 460.",
    ],
    [gonzalo._id, "Perfecto, caigo a las 18hs. Gracias!"],
  ]);
  await mkMsgs(orderSofiaGaseosas._id, [
    [sofia._id, "Hola! Reservé las gaseosas. ¿Las pueden guardar hasta las 19hs?"],
    [rosi._id, "Hola Sofía! Claro, sin problema. Estamos en Rivadavia 5600, Caballito."],
    [sofia._id, "Perfecto, voy a las 19hs pasadas."],
    [rosi._id, "Dale, te las tenemos guardadas. ¡Hasta luego!"],
  ]);
  await mkMsgs(orderDiegoChoclos._id, [
    [diego._id, "Hola, reservé los choclos. Paso a buscarlos mañana a la mañana."],
    [ernesto._id, "Perfecto Diego! Te los tengo apartados."],
    [diego._id, "Gracias, ya los retiré. Muy tiernos, ideales para la parrilla!"],
    [ernesto._id, "Qué bueno! Bienvenido cuando quieras."],
  ]);
  await mkMsgs(orderLucas._id, [
    [lucas._id, "Buenas! Reservé la torta. ¿Tienen caja para llevarla?"],
    [hornito._id, "Hola Lucas! Sí, la embalamos bien para que no se deforme. ¿A qué hora pasás?"],
    [lucas._id, "A las 16hs aproximadamente."],
    [hornito._id, "Perfecto. Podés pagar en efectivo o transferencia, lo que prefieras."],
    [lucas._id, "Transferencia me viene mejor. ¿Cuál es el alias?"],
    [hornito._id, "HORNITO.CABA. Mandá el comprobante al pasar, ¡te esperamos!"],
  ]);
  await mkMsgs(orderAna._id, [
    [hornito._id, "¡Hola Ana! Las medialunas de grasa están listas para retirar."],
    [ana._id, "Genial, voy en unos minutos."],
    [hornito._id, "Perfecto, te esperamos."],
    [ana._id, "Ya las retiré. Riquísimas, muchas gracias!"],
  ]);
  await mkMsgs(orderJulian._id, [
    [julian._id, "Buenas tardes. ¿Las zanahorias llegaron hoy?"],
    [ernesto._id, "Hola Julián! Sí, compra de esta mañana. Muy buenas para jugo o para ensalada."],
    [julian._id, "Perfecto, paso a las 17hs."],
    [ernesto._id, "Anotado. Estamos en Balcarce 460, San Telmo."],
    [julian._id, "¡Gracias, nos vemos pronto!"],
  ]);
  await mkMsgs(orderPaula._id, [
    [paula._id, "Hola! Ya pasé a buscar las manzanas. Muy buenas, gracias."],
    [ernesto._id, "Qué bueno Paula! Gracias a vos. Volvé cuando quieras."],
    [paula._id, "La semana que viene seguro paso de nuevo."],
  ]);
  await mkMsgs(orderRoberto._id, [
    [roberto._id, "Hola! ¿La mermelada de frutilla viene en pote o frasco de vidrio?"],
    [rosi._id, "Hola Roberto! Es en frasco de vidrio, 440g. Muy buena, semi-artesanal."],
    [roberto._id, "Perfecto, paso mañana a la mañana."],
    [rosi._id, "Te la guardamos hasta las 12hs. ¡Hasta mañana!"],
  ]);
  await mkMsgs(orderValentina2._id, [
    [valentina._id, "Hola de vuelta! Reservé las galletitas."],
    [rosi._id, "¡Hola Valentina! Qué bueno verte de vuelta. ¿Venís hoy?"],
    [valentina._id, "Sí, a las 18hs."],
    [rosi._id, "Perfecto, te las tenemos listas."],
    [valentina._id, "¡Ya las retiré! Como siempre, excelente atención. Gracias Rosi."],
  ]);
  await mkMsgs(orderGonzalo2._id, [
    [gonzalo._id, "Hola! Vi las hamburguesas. ¿De qué carne son?"],
    [pedro._id, "¡Hola Gonzalo! Son de paleta con chimichurri, 100% artesanales, 200g cada una."],
    [gonzalo._id, "¿Las puedo congelar si no las uso todas hoy?"],
    [pedro._id, "Sí, sin problema. Aguantan 3 meses congeladas."],
    [gonzalo._id, "Genial. Paso esta tarde a retirarlas."],
    [pedro._id, "Perfecto, te esperamos. Estamos en Medrano 800, Almagro."],
  ]);
  await mkMsgs(orderDiego2._id, [
    [diego._id, "Buenas! Ya retiré el peceto. Calidad top."],
    [pedro._id, "Gracias Diego! ¿Cómo lo preparaste?"],
    [diego._id, "Al horno con papas. Quedó espectacular."],
    [pedro._id, "Qué bueno! Cuando quieras más, avisanos."],
  ]);
  await mkMsgs(orderSofia2._id, [
    [sofia._id, "Hola! ¿Las lentejas están bien conservadas?"],
    [marta._id, "Hola Sofía! Sí, son de stock nuevo, vencen en 8 meses. Ideales para guiso."],
    [sofia._id, "Perfecto, paso mañana a la mañana."],
  ]);
  await mkMsgs(orderNatalia2._id, [
    [natalia._id, "Hola! Reservé la yerba, me quedé sin stock en casa jaja."],
    [marta._id, "¡Hola Natalia! Jaja, la Rosamonte no puede faltar. ¿Pasás hoy?"],
    [natalia._id, "Sí, ahora en un rato."],
    [marta._id, "Ya la tenemos lista. ¡Hasta ahora!"],
  ]);
  await mkMsgs(orderLucas2._id, [
    [lucas._id, "Hola! ¿La fugazzeta sale del horno a qué hora?"],
    [carlos._id, "Hola Lucas! A las 18:30. Para las 20hs la tenés perfecta."],
    [lucas._id, "¿Tiene mucho queso?"],
    [carlos._id, "Doble muzzarella y cebolla caramelizada. Una bomba garantizada."],
    [lucas._id, "Jaja perfecto! Paso a las 20hs entonces."],
  ]);
  await mkMsgs(orderAna2._id, [
    [ana._id, "Hola! Ya retiré el calzone. Estaba riquísimo."],
    [carlos._id, "¡Gracias Ana! ¿Te gustó el relleno?"],
    [ana._id, "Sí, el de ricotta y espinaca está muy bueno. Vuelvo pronto."],
  ]);
  await mkMsgs(orderRoberto2._id, [
    [roberto._id, "Hola! ¿Las mandarinas tienen cáscara fácil de pelar?"],
    [
      ernesto._id,
      "Hola Roberto! Sí, son tucumanas, muy jugosas y fáciles de pelar. Las favoritas del barrio.",
    ],
    [roberto._id, "Paso esta tarde. ¿Hasta qué hora están?"],
    [ernesto._id, "Hasta las 19hs. ¡Te esperamos!"],
  ]);

  console.log("✅  72 mensajes creados");

  // ===== NOTIFICACIONES (52) =====

  await Notification.create([
    // Reservas existentes
    mkNotif(
      hornito._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Valentina Suárez reservó Bizcochos de grasa x15",
      orderValentinaBizcochos._id,
      "ORDER",
      true
    ),
    mkNotif(
      hornito._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Natalia Ferreyra reservó Chipá de almidón x10",
      orderNataliaChipa._id,
      "ORDER",
      true
    ),
    mkNotif(
      hornito._id,
      "RESERVATION_CANCELLED_BY_CONSUMER",
      "Reserva cancelada",
      "Gonzalo López canceló su reserva de Leche La Serenísima x6",
      null,
      null,
      false
    ),
    mkNotif(
      hornito._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Valentina Suárez te envió un mensaje",
      orderValentinaBizcochos._id,
      "ORDER",
      true
    ),
    mkNotif(
      ernesto._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Gonzalo López reservó Peras Williams x5",
      orderGonzaloPeras._id,
      "ORDER",
      false
    ),
    mkNotif(
      ernesto._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Diego Hernández reservó Choclos tiernos x4",
      orderDiegoChoclos._id,
      "ORDER",
      true
    ),
    mkNotif(
      ernesto._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Gonzalo López te envió un mensaje",
      orderGonzaloPeras._id,
      "ORDER",
      false
    ),
    mkNotif(
      rosi._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Sofía Romero reservó Gaseosas surtidas x6",
      orderSofiaGaseosas._id,
      "ORDER",
      false
    ),
    mkNotif(
      valentina._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Panadería El Hornito te envió un mensaje",
      orderValentinaBizcochos._id,
      "ORDER",
      false
    ),
    mkNotif(
      diego._id,
      "ORDER_DELIVERED",
      "Pedido entregado",
      "Tu pedido de Choclos tiernos x4 fue marcado como entregado",
      orderDiegoChoclos._id,
      "ORDER",
      true
    ),
    mkNotif(
      natalia._id,
      "ORDER_DELIVERED",
      "Pedido entregado",
      "Tu pedido de Chipá de almidón x10 fue marcado como entregado",
      orderNataliaChipa._id,
      "ORDER",
      false
    ),
    mkNotif(
      gonzalo._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Frutería y Verdulería La Esquina de Ernesto te envió un mensaje",
      orderGonzaloPeras._id,
      "ORDER",
      true
    ),
    // Nuevas reservas
    mkNotif(
      hornito._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Lucas Medina reservó Torta de chocolate 20cm",
      orderLucas._id,
      "ORDER",
      false
    ),
    mkNotif(
      hornito._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Ana Gómez reservó Medialunas de grasa x10",
      orderAna._id,
      "ORDER",
      true
    ),
    mkNotif(
      ernesto._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Julián Castro reservó Zanahorias baby 500g",
      orderJulian._id,
      "ORDER",
      false
    ),
    mkNotif(
      ernesto._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Paula Vargas reservó Manzanas rojas x6",
      orderPaula._id,
      "ORDER",
      true
    ),
    mkNotif(
      ernesto._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Roberto Silva reservó Mandarinas de Tucumán 2 kg",
      orderRoberto2._id,
      "ORDER",
      false
    ),
    mkNotif(
      rosi._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Roberto Silva reservó Mermelada Liguria frutilla 440g",
      orderRoberto._id,
      "ORDER",
      false
    ),
    mkNotif(
      rosi._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Valentina Suárez reservó Galletitas Bagley surtidas x3 paquetes",
      orderValentina2._id,
      "ORDER",
      true
    ),
    mkNotif(
      pedro._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Gonzalo López reservó Hamburguesas caseras x4",
      orderGonzalo2._id,
      "ORDER",
      false
    ),
    mkNotif(
      pedro._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Diego Hernández reservó Peceto en tiras 500g",
      orderDiego2._id,
      "ORDER",
      true
    ),
    mkNotif(
      marta._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Sofía Romero reservó Lentejas x500g",
      orderSofia2._id,
      "ORDER",
      false
    ),
    mkNotif(
      marta._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Natalia Ferreyra reservó Yerba Mate Rosamonte 500g",
      orderNatalia2._id,
      "ORDER",
      true
    ),
    mkNotif(
      carlos._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Lucas Medina reservó Fugazzeta rellena 30cm",
      orderLucas2._id,
      "ORDER",
      false
    ),
    mkNotif(
      carlos._id,
      "NEW_RESERVATION",
      "Nueva reserva",
      "Ana Gómez reservó Calzone de ricotta y espinaca",
      orderAna2._id,
      "ORDER",
      true
    ),
    // Pedidos entregados
    mkNotif(
      ana._id,
      "ORDER_DELIVERED",
      "Pedido entregado",
      "Tu pedido de Medialunas de grasa x10 fue marcado como entregado",
      orderAna._id,
      "ORDER",
      true
    ),
    mkNotif(
      paula._id,
      "ORDER_DELIVERED",
      "Pedido entregado",
      "Tu pedido de Manzanas rojas x6 fue marcado como entregado",
      orderPaula._id,
      "ORDER",
      false
    ),
    mkNotif(
      valentina._id,
      "ORDER_DELIVERED",
      "Pedido entregado",
      "Tu pedido de Galletitas Bagley surtidas x3 paquetes fue marcado como entregado",
      orderValentina2._id,
      "ORDER",
      true
    ),
    mkNotif(
      diego._id,
      "ORDER_DELIVERED",
      "Pedido entregado",
      "Tu pedido de Peceto en tiras 500g fue marcado como entregado",
      orderDiego2._id,
      "ORDER",
      false
    ),
    mkNotif(
      natalia._id,
      "ORDER_DELIVERED",
      "Pedido entregado",
      "Tu pedido de Yerba Mate Rosamonte 500g fue marcado como entregado",
      orderNatalia2._id,
      "ORDER",
      false
    ),
    mkNotif(
      ana._id,
      "ORDER_DELIVERED",
      "Pedido entregado",
      "Tu pedido de Calzone de ricotta y espinaca fue marcado como entregado",
      orderAna2._id,
      "ORDER",
      true
    ),
    // Reserva cancelada
    mkNotif(
      pedro._id,
      "RESERVATION_CANCELLED_BY_CONSUMER",
      "Reserva cancelada",
      "Paula Vargas canceló su reserva de Achuras surtidas x2 porciones",
      null,
      null,
      false
    ),
    // Nuevos mensajes
    mkNotif(
      rosi._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Sofía Romero te envió un mensaje",
      orderSofiaGaseosas._id,
      "ORDER",
      true
    ),
    mkNotif(
      sofia._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Almacén La Despensa de Rosi te envió un mensaje",
      orderSofiaGaseosas._id,
      "ORDER",
      false
    ),
    mkNotif(
      hornito._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Lucas Medina te envió un mensaje",
      orderLucas._id,
      "ORDER",
      false
    ),
    mkNotif(
      lucas._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Panadería El Hornito te envió un mensaje",
      orderLucas._id,
      "ORDER",
      false
    ),
    mkNotif(
      ernesto._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Julián Castro te envió un mensaje",
      orderJulian._id,
      "ORDER",
      false
    ),
    mkNotif(
      julian._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Frutería y Verdulería La Esquina de Ernesto te envió un mensaje",
      orderJulian._id,
      "ORDER",
      true
    ),
    mkNotif(
      pedro._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Gonzalo López te envió un mensaje",
      orderGonzalo2._id,
      "ORDER",
      false
    ),
    mkNotif(
      gonzalo._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Carnicería San José te envió un mensaje",
      orderGonzalo2._id,
      "ORDER",
      false
    ),
    mkNotif(
      carlos._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Lucas Medina te envió un mensaje",
      orderLucas2._id,
      "ORDER",
      false
    ),
    mkNotif(
      lucas._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Pizzería Rey te envió un mensaje",
      orderLucas2._id,
      "ORDER",
      false
    ),
    mkNotif(
      ernesto._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Roberto Silva te envió un mensaje",
      orderRoberto2._id,
      "ORDER",
      false
    ),
    mkNotif(
      roberto._id,
      "NEW_MESSAGE",
      "Nuevo mensaje",
      "Frutería y Verdulería La Esquina de Ernesto te envió un mensaje",
      orderRoberto2._id,
      "ORDER",
      false
    ),
    // Publicaciones por vencer
    mkNotif(
      hornito._id,
      "PUBLICATION_EXPIRING",
      "Publicación por vencer",
      "Tu publicación 'Medialunas de manteca x12' vence en menos de 24hs",
      pubMedialunas._id,
      "PUBLICATION",
      false
    ),
    mkNotif(
      ernesto._id,
      "PUBLICATION_EXPIRING",
      "Publicación por vencer",
      "Tu publicación 'Bananas de Ecuador 1 kg' vence en menos de 24hs",
      pubBananas._id,
      "PUBLICATION",
      true
    ),
    mkNotif(
      rosi._id,
      "PUBLICATION_EXPIRING",
      "Publicación por vencer",
      "Tu publicación 'Yogur firme Ser natural x4' vence en menos de 24hs",
      pubYogur._id,
      "PUBLICATION",
      false
    ),
    mkNotif(
      pedro._id,
      "PUBLICATION_EXPIRING",
      "Publicación por vencer",
      "Tu publicación 'Milanesas de nalga x4' vence en menos de 24hs",
      pubMilanesas._id,
      "PUBLICATION",
      false
    ),
    mkNotif(
      marta._id,
      "PUBLICATION_EXPIRING",
      "Publicación por vencer",
      "Tu publicación 'Fideos Matarazzo surtidos x3 paquetes' vence en menos de 24hs",
      pubFideos._id,
      "PUBLICATION",
      true
    ),
    mkNotif(
      carlos._id,
      "PUBLICATION_EXPIRING",
      "Publicación por vencer",
      "Tu publicación 'Pizza napolitana 34cm' vence en menos de 24hs",
      pubPizzaNapo._id,
      "PUBLICATION",
      false
    ),
    // Publicaciones vencidas
    mkNotif(
      hornito._id,
      "PUBLICATION_EXPIRED",
      "Publicación vencida",
      "Tu publicación 'Cuernitos de vainilla x8' ha vencido",
      pubCuernitos._id,
      "PUBLICATION",
      true
    ),
    mkNotif(
      pedro._id,
      "PUBLICATION_EXPIRED",
      "Publicación vencida",
      "Tu publicación 'Vacío premium 600g' ha vencido",
      pubVacio._id,
      "PUBLICATION",
      false
    ),
  ]);

  console.log("✅  52 notificaciones creadas");

  // ===== FAVORITOS (39) =====

  await Favorite.create([
    { user_id: valentina._id, publication_id: pubMedialunas._id },
    { user_id: valentina._id, publication_id: pubBananas._id },
    { user_id: valentina._id, publication_id: pubTortaChocolate._id },
    { user_id: valentina._id, publication_id: pubMermelada._id },
    { user_id: valentina._id, publication_id: pubPizzaNapo._id },
    { user_id: gonzalo._id, publication_id: pubTomates._id },
    { user_id: gonzalo._id, publication_id: pubLeche._id },
    { user_id: gonzalo._id, publication_id: pubFacturas._id },
    { user_id: gonzalo._id, publication_id: pubHamburguesas._id },
    { user_id: gonzalo._id, publication_id: pubFideos._id },
    { user_id: gonzalo._id, publication_id: pubYerba._id },
    { user_id: sofia._id, publication_id: pubBananas._id },
    { user_id: sofia._id, publication_id: pubGaseosas._id },
    { user_id: sofia._id, publication_id: pubLentejas._id },
    { user_id: sofia._id, publication_id: pubCalzone._id },
    { user_id: diego._id, publication_id: pubChoclos._id },
    { user_id: diego._id, publication_id: pubPeceto._id },
    { user_id: diego._id, publication_id: pubMilanesas._id },
    { user_id: diego._id, publication_id: pubHamburguesas._id },
    { user_id: natalia._id, publication_id: pubChipa._id },
    { user_id: natalia._id, publication_id: pubQueso._id },
    { user_id: natalia._id, publication_id: pubFugazzeta._id },
    { user_id: natalia._id, publication_id: pubEmpanadas._id },
    { user_id: lucas._id, publication_id: pubTortaChocolate._id },
    { user_id: lucas._id, publication_id: pubBizcochos._id },
    { user_id: lucas._id, publication_id: pubPanMiga._id },
    { user_id: ana._id, publication_id: pubGalletitas._id },
    { user_id: ana._id, publication_id: pubMedialunasGrasa._id },
    { user_id: ana._id, publication_id: pubPizzaNapo._id },
    { user_id: julian._id, publication_id: pubZanahorias._id },
    { user_id: julian._id, publication_id: pubUvas._id },
    { user_id: julian._id, publication_id: pubChoclos._id },
    { user_id: paula._id, publication_id: pubManzanas._id },
    { user_id: paula._id, publication_id: pubAceite._id },
    { user_id: paula._id, publication_id: pubMandarinas._id },
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
  console.log("     valentina@mail.com  gonzalo@mail.com  sofia@mail.com");
  console.log("     diego@mail.com      natalia@mail.com  lucas@mail.com");
  console.log("     ana@mail.com        julian@mail.com   paula@mail.com");
  console.log("     roberto@mail.com");
  console.log("");
  console.log("   Consumidores sin dirección:");
  console.log("     camila@mail.com");
  console.log("     martin@mail.com");
};

try {
  await seed();
} catch (err) {
  console.error("❌ Error en seed:", err.message);
  process.exit(1);
}
