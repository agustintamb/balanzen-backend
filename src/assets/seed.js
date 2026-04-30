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
import { hashPassword } from "#services/auth.service.js";

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

  // --- Comercios ---
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
  });
  await Address.create({
    user_id: hornito._id,
    formatted_address: "Av. Corrientes 2468, Balvanera, CABA",
    street: "Av. Corrientes",
    number: "2468",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6068,
    lng: -58.4033,
    is_selected: true,
  });

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
  });
  await Address.create({
    user_id: ernesto._id,
    formatted_address: "Balcarce 460, San Telmo, CABA",
    street: "Balcarce",
    number: "460",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6198,
    lng: -58.3728,
    is_selected: true,
  });

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
  });
  await Address.create({
    user_id: rosi._id,
    formatted_address: "Av. Rivadavia 5600, Caballito, CABA",
    street: "Av. Rivadavia",
    number: "5600",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6178,
    lng: -58.4362,
    is_selected: true,
  });

  console.log("✅  3 comercios creados");

  // --- Consumidores ---
  const valentina = await User.create({
    email: "valentina@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Valentina",
    last_name: "Suárez",
    phone: "1155667788",
    dni: "37111111",
  });
  await Address.create([
    {
      user_id: valentina._id,
      formatted_address: "Thames 1500, Palermo, CABA",
      street: "Thames",
      number: "1500",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.5886,
      lng: -58.4271,
      is_selected: true,
    },
    {
      user_id: valentina._id,
      formatted_address: "Av. Corrientes 4200, Villa Crespo, CABA",
      street: "Av. Corrientes",
      number: "4200",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.5988,
      lng: -58.4398,
      is_selected: false,
    },
  ]);

  const gonzalo = await User.create({
    email: "gonzalo@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Gonzalo",
    last_name: "López",
    phone: "1166778899",
    dni: "38222222",
  });
  await Address.create([
    {
      user_id: gonzalo._id,
      formatted_address: "Cabildo 2000, Belgrano, CABA",
      street: "Cabildo",
      number: "2000",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.5617,
      lng: -58.4583,
      is_selected: true,
    },
    {
      user_id: gonzalo._id,
      formatted_address: "Av. del Libertador 6000, Núñez, CABA",
      street: "Av. del Libertador",
      number: "6000",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.5463,
      lng: -58.4641,
      is_selected: false,
    },
  ]);

  const sofia = await User.create({
    email: "sofia@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Sofía",
    last_name: "Romero",
    phone: "1177889900",
    dni: "39333333",
  });
  await Address.create([
    {
      user_id: sofia._id,
      formatted_address: "Defensa 800, San Telmo, CABA",
      street: "Defensa",
      number: "800",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.6224,
      lng: -58.3712,
      is_selected: true,
    },
    {
      user_id: sofia._id,
      formatted_address: "Av. Regimiento Patricios 1200, Barracas, CABA",
      street: "Av. Regimiento Patricios",
      number: "1200",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.6391,
      lng: -58.3827,
      is_selected: false,
    },
  ]);

  const diego = await User.create({
    email: "diego@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Diego",
    last_name: "Hernández",
    phone: "1188990011",
    dni: "40444444",
  });
  await Address.create([
    {
      user_id: diego._id,
      formatted_address: "Av. Rivadavia 7000, Flores, CABA",
      street: "Av. Rivadavia",
      number: "7000",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.6295,
      lng: -58.4613,
      is_selected: true,
    },
    {
      user_id: diego._id,
      formatted_address: "Av. Acoyte 100, Caballito, CABA",
      street: "Av. Acoyte",
      number: "100",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.6158,
      lng: -58.4381,
      is_selected: false,
    },
  ]);

  const natalia = await User.create({
    email: "natalia@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Natalia",
    last_name: "Ferreyra",
    phone: "1199001122",
    dni: "41555555",
  });
  await Address.create([
    {
      user_id: natalia._id,
      formatted_address: "Av. Alvear 1800, Recoleta, CABA",
      street: "Av. Alvear",
      number: "1800",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.5858,
      lng: -58.3928,
      is_selected: true,
    },
    {
      user_id: natalia._id,
      formatted_address: "Libertad 500, Retiro, CABA",
      street: "Libertad",
      number: "500",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.5889,
      lng: -58.3742,
      is_selected: false,
    },
  ]);

  console.log("✅  5 consumidores creados con direcciones");

  // --- Publicaciones ---
  // El Hornito — Panadería (7 pubs)
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
    expiry_date: days(-3),
    category_id: catMap["Panificados"],
    status: "CANCELLED",
    deleted_at: new Date(),
  });

  console.log("✅  7 publicaciones El Hornito");

  // La Esquina de Ernesto — Frutería y Verdulería (6 pubs)
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
    expiry_date: days(1),
    category_id: catMap["Verduras"],
    status: "ACTIVE",
  });

  console.log("✅  6 publicaciones La Esquina de Ernesto");

  // La Despensa de Rosi — Almacén (5 pubs)
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

  await Publication.create({
    commerce_id: rosi._id,
    title: "Yogur firme Ser natural x4",
    description: "Yogur entero sin azúcar, 200g cada uno. Vencen en 4 días.",
    original_price: 2800,
    final_price: 1400,
    expiry_date: days(4),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  await Publication.create({
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

  console.log("✅  5 publicaciones La Despensa de Rosi");

  // --- Orders ---
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

  console.log("✅  6 órdenes creadas");

  // --- Messages ---
  // Valentina ↔ El Hornito sobre bizcochos (RESERVED) — 5 mensajes
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

  // Gonzalo ↔ La Esquina de Ernesto sobre peras (RESERVED) — 3 mensajes
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

  // Diego ↔ La Esquina de Ernesto sobre choclos (DELIVERED) — 4 mensajes
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

  console.log("✅  12 mensajes creados");

  // --- Notifications ---
  await Notification.create([
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
  ]);

  console.log("✅  12 notificaciones creadas");

  // --- Favorites ---
  await Favorite.create([
    { user_id: valentina._id, publication_id: pubMedialunas._id },
    { user_id: valentina._id, publication_id: pubBananas._id },
    { user_id: gonzalo._id, publication_id: pubTomates._id },
    { user_id: gonzalo._id, publication_id: pubLeche._id },
    { user_id: gonzalo._id, publication_id: pubFacturas._id },
    { user_id: sofia._id, publication_id: pubBananas._id },
  ]);

  console.log("✅  6 favoritos creados");

  await mongoose.disconnect();
  console.log("🔌  Desconectado");
  console.log("");
  console.log("🎉  Seed completo!");
  console.log("   Admin:        admin@balanzen.com  /  Admin123");
  console.log(
    "   Comercios:    facundo@elhornito.com | ernesto@verduleria.com | rosi@ladespensa.com  /  Test1234"
  );
  console.log(
    "   Consumidores: valentina | gonzalo | sofia | diego | natalia @mail.com  /  Test1234"
  );
};

seed().catch((err) => {
  console.error("❌ Error en seed:", err.message);
  process.exit(1);
});
