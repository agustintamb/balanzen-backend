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

  // --- Admin ---
  const existingAdmin = await User.findOne({ email: "admin@balanzen.com" });
  if (existingAdmin) {
    console.log("⚠️  El admin ya existe, omitiendo...");
  } else {
    const password = await hashPassword("Admin123");
    await User.create({
      email: "admin@balanzen.com",
      password,
      role: "ADMIN",
      first_name: "Admin",
      last_name: "BalanZen",
      phone: "1100000000",
      dni: "00000000",
    });
    console.log("✅  Admin creado: admin@balanzen.com / Admin123");
  }

  // --- Categorías ---
  const catMap = {};
  for (const name of CATEGORIES) {
    let cat = await Category.findOne({ name });
    if (!cat) {
      cat = await Category.create({ name });
      console.log(`✅  Categoría creada: ${name}`);
    } else {
      console.log(`⚠️  Categoría ya existe: ${name}`);
    }
    catMap[name] = cat._id;
  }

  // Evitar duplicar datos de demo
  const existingMario = await User.findOne({ email: "mario@comercio.com" });
  if (existingMario) {
    console.log("⚠️  Datos de demo ya existen, omitiendo...");
    await mongoose.disconnect();
    return;
  }

  const password = await hashPassword("Test1234");

  // --- Comercios ---
  const mario = await User.create({
    email: "mario@comercio.com",
    password,
    role: "COMERCIO",
    first_name: "Mario",
    last_name: "González",
    phone: "1144556677",
    dni: "25111111",
    business_name: "Verdulería Don Mario",
    cuit: "20251111112",
  });
  await Address.create({
    user_id: mario._id,
    formatted_address: "Av. Corrientes 1234, CABA",
    street: "Av. Corrientes",
    number: "1234",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6037,
    lng: -58.3816,
    is_selected: true,
  });

  const estrella = await User.create({
    email: "estrella@comercio.com",
    password,
    role: "COMERCIO",
    first_name: "Carmen",
    last_name: "Torres",
    phone: "1133445566",
    dni: "26222222",
    business_name: "Panadería La Estrella",
    cuit: "27262222223",
  });
  await Address.create({
    user_id: estrella._id,
    formatted_address: "Av. Rivadavia 3000, CABA",
    street: "Av. Rivadavia",
    number: "3000",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6171,
    lng: -58.429,
    is_selected: true,
  });

  const rincon = await User.create({
    email: "rincon@comercio.com",
    password,
    role: "COMERCIO",
    first_name: "Roberto",
    last_name: "Sánchez",
    phone: "1122334455",
    dni: "27333333",
    business_name: "Almacén El Rincón",
    cuit: "20273333334",
  });
  await Address.create({
    user_id: rincon._id,
    formatted_address: "Av. Santa Fe 4500, CABA",
    street: "Av. Santa Fe",
    number: "4500",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.5857,
    lng: -58.4283,
    is_selected: true,
  });

  console.log("✅  3 comercios creados");

  // --- Consumidores ---
  const juan = await User.create({
    email: "juan@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Juan",
    last_name: "Pérez",
    phone: "1155667788",
    dni: "35111111",
  });
  await Address.create([
    {
      user_id: juan._id,
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
      user_id: juan._id,
      formatted_address: "Corrientes 4200, Villa Crespo, CABA",
      street: "Corrientes",
      number: "4200",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.5988,
      lng: -58.4398,
      is_selected: false,
    },
  ]);

  const ana = await User.create({
    email: "ana@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Ana",
    last_name: "García",
    phone: "1166778899",
    dni: "36222222",
  });
  await Address.create([
    {
      user_id: ana._id,
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
      user_id: ana._id,
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

  const luis = await User.create({
    email: "luis@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Luis",
    last_name: "Martínez",
    phone: "1177889900",
    dni: "37333333",
  });
  await Address.create([
    {
      user_id: luis._id,
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
      user_id: luis._id,
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

  const maria = await User.create({
    email: "maria@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "María",
    last_name: "López",
    phone: "1188990011",
    dni: "38444444",
  });
  await Address.create([
    {
      user_id: maria._id,
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
      user_id: maria._id,
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

  const pedro = await User.create({
    email: "pedro@mail.com",
    password,
    role: "CONSUMIDOR",
    first_name: "Pedro",
    last_name: "Fernández",
    phone: "1199001122",
    dni: "39555555",
  });
  await Address.create([
    {
      user_id: pedro._id,
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
      user_id: pedro._id,
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
  // Don Mario - Verdulería (7 pubs)
  const pubEspinacas = await Publication.create({
    commerce_id: mario._id,
    title: "Espinacas frescas por vencer",
    description: "Atado de espinacas frescas cosechadas hoy. Ideal para ensaladas o tartas.",
    original_price: 800,
    final_price: 480,
    expiry_date: days(3),
    category_id: catMap["Verduras"],
    status: "ACTIVE",
  });

  const pubTomates = await Publication.create({
    commerce_id: mario._id,
    title: "Tomates cherry 500g",
    description: "Tomates cherry maduros, perfectos para ensaladas. Vencen mañana.",
    original_price: 600,
    final_price: 300,
    expiry_date: days(1),
    category_id: catMap["Verduras"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: mario._id,
    title: "Mix de lechugas x3",
    description: "Tres tipos de lechuga: romana, mantecosa y morada. Excelente frescura.",
    original_price: 500,
    final_price: 200,
    expiry_date: days(2),
    category_id: catMap["Verduras"],
    status: "ACTIVE",
  });

  const pubZanahorias = await Publication.create({
    commerce_id: mario._id,
    title: "Zanahorias baby 1kg",
    description: "Zanahorias baby peladas y listas para consumir.",
    original_price: 700,
    final_price: 490,
    expiry_date: days(2),
    category_id: catMap["Verduras"],
    status: "RESERVED",
  });

  const pubPepinos = await Publication.create({
    commerce_id: mario._id,
    title: "Pepinos x4",
    description: "Pepinos frescos, tamaño mediano.",
    original_price: 400,
    final_price: 220,
    expiry_date: days(-1),
    category_id: catMap["Verduras"],
    status: "DELIVERED",
  });

  await Publication.create({
    commerce_id: mario._id,
    title: "Acelga hoja grande",
    description: "Manojos de acelga. Vencidos.",
    original_price: 350,
    final_price: 140,
    expiry_date: days(-2),
    category_id: catMap["Verduras"],
    status: "EXPIRED",
  });

  await Publication.create({
    commerce_id: mario._id,
    title: "Remolacha cocida - DONACIÓN",
    description: "Remolacha cocida lista para servir. Sin costo.",
    original_price: 0,
    final_price: 0,
    expiry_date: days(-3),
    category_id: catMap["Verduras"],
    status: "CANCELLED",
    deleted_at: new Date(),
  });

  console.log("✅  7 publicaciones Don Mario");

  // La Estrella - Panadería (6 pubs)
  const pubMedialunas = await Publication.create({
    commerce_id: estrella._id,
    title: "Medialunas de manteca x12",
    description: "Medialunas recién horneadas esta mañana.",
    original_price: 2400,
    final_price: 720,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  const pubPanLactal = await Publication.create({
    commerce_id: estrella._id,
    title: "Pan lactal artesanal",
    description: "Pan lactal integral de masa madre, 500g.",
    original_price: 1800,
    final_price: 900,
    expiry_date: days(2),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  const pubFacturas = await Publication.create({
    commerce_id: estrella._id,
    title: "Facturas surtidas x8",
    description: "Surtido de facturas: vigilantes, cañoncitos y libritos.",
    original_price: 3200,
    final_price: 1280,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  const pubBizcochos = await Publication.create({
    commerce_id: estrella._id,
    title: "Bizcochos de grasa x10",
    description: "Bizcochos caseros bien crujientes.",
    original_price: 1500,
    final_price: 900,
    expiry_date: days(2),
    category_id: catMap["Panificados"],
    status: "RESERVED",
  });

  const pubTarta = await Publication.create({
    commerce_id: estrella._id,
    title: "Tarta de ricotta y espinaca",
    description: "Tarta casera 30cm, porción familiar.",
    original_price: 4000,
    final_price: 2800,
    expiry_date: days(-1),
    category_id: catMap["Panificados"],
    status: "DELIVERED",
  });

  await Publication.create({
    commerce_id: estrella._id,
    title: "Pan de campo - DONACIÓN",
    description: "Pan de campo del día anterior. Lo donamos antes de tirarlo.",
    original_price: 0,
    final_price: 0,
    expiry_date: days(1),
    category_id: catMap["Panificados"],
    status: "ACTIVE",
  });

  console.log("✅  6 publicaciones La Estrella");

  // El Rincón - Almacén (5 pubs)
  const pubLeche = await Publication.create({
    commerce_id: rincon._id,
    title: "Leche entera x6 unidades",
    description: "Sachet de leche entera 1L, vence en 3 días.",
    original_price: 3600,
    final_price: 2340,
    expiry_date: days(3),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: rincon._id,
    title: "Yogur griego x4",
    description: "Yogur griego natural sin azúcar, 200g cada uno.",
    original_price: 2800,
    final_price: 1680,
    expiry_date: days(4),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  await Publication.create({
    commerce_id: rincon._id,
    title: "Queso cremoso 400g",
    description: "Queso cremoso en horma, apto para untar.",
    original_price: 3200,
    final_price: 1440,
    expiry_date: days(5),
    category_id: catMap["Lácteos"],
    status: "ACTIVE",
  });

  const pubBebidas = await Publication.create({
    commerce_id: rincon._id,
    title: "Bebidas surtidas x6",
    description: "Gaseosas y jugos varios, vencen esta semana.",
    original_price: 4800,
    final_price: 2640,
    expiry_date: days(4),
    category_id: catMap["Bebidas"],
    status: "RESERVED",
  });

  await Publication.create({
    commerce_id: rincon._id,
    title: "Jugos de fruta x4",
    description: "Jugos naturales de naranja y manzana, sin conservantes.",
    original_price: 2000,
    final_price: 1500,
    expiry_date: days(2),
    category_id: catMap["Bebidas"],
    status: "ACTIVE",
  });

  console.log("✅  5 publicaciones El Rincón");

  // --- Orders ---
  const orderJuanZanahorias = await Order.create({
    consumer_id: juan._id,
    commerce_id: mario._id,
    publication_id: pubZanahorias._id,
    status: "RESERVED",
  });

  const orderAnaBizcochos = await Order.create({
    consumer_id: ana._id,
    commerce_id: estrella._id,
    publication_id: pubBizcochos._id,
    status: "RESERVED",
  });

  const orderLuisBebidas = await Order.create({
    consumer_id: luis._id,
    commerce_id: rincon._id,
    publication_id: pubBebidas._id,
    status: "RESERVED",
  });

  const orderMariaPepinos = await Order.create({
    consumer_id: maria._id,
    commerce_id: mario._id,
    publication_id: pubPepinos._id,
    status: "DELIVERED",
  });

  const orderPedroTarta = await Order.create({
    consumer_id: pedro._id,
    commerce_id: estrella._id,
    publication_id: pubTarta._id,
    status: "DELIVERED",
  });

  await Order.create({
    consumer_id: pedro._id,
    commerce_id: rincon._id,
    publication_id: pubLeche._id,
    status: "CANCELLED",
  });

  console.log("✅  6 órdenes creadas");

  // --- Messages ---
  // Juan ↔ Don Mario sobre zanahorias (RESERVED) — 5 mensajes
  await Message.create({
    order_id: orderJuanZanahorias._id,
    sender_id: juan._id,
    content: "Hola! Paso a buscar las zanahorias hoy a las 18hs, está bien?",
  });
  await Message.create({
    order_id: orderJuanZanahorias._id,
    sender_id: mario._id,
    content: "Sí claro! Te espero hasta las 19hs. El local está en Corrientes 1234.",
  });
  await Message.create({
    order_id: orderJuanZanahorias._id,
    sender_id: juan._id,
    content: "Perfecto, muchas gracias!",
  });
  await Message.create({
    order_id: orderJuanZanahorias._id,
    sender_id: mario._id,
    content: "De nada! Cualquier cosa avisame.",
  });
  await Message.create({
    order_id: orderJuanZanahorias._id,
    sender_id: juan._id,
    content: "Ok, en un rato estoy.",
  });

  // Ana ↔ La Estrella sobre bizcochos (RESERVED) — 3 mensajes
  await Message.create({
    order_id: orderAnaBizcochos._id,
    sender_id: ana._id,
    content: "Buenos días! Cuándo puedo pasar a retirar los bizcochos?",
  });
  await Message.create({
    order_id: orderAnaBizcochos._id,
    sender_id: estrella._id,
    content: "Buenas! Podés pasar hoy hasta las 20hs.",
  });
  await Message.create({
    order_id: orderAnaBizcochos._id,
    sender_id: ana._id,
    content: "Genial, paso a las 17hs entonces. Gracias!",
  });

  // María ↔ Don Mario sobre pepinos (DELIVERED) — 4 mensajes
  await Message.create({
    order_id: orderMariaPepinos._id,
    sender_id: maria._id,
    content: "Hola, reservé los pepinos. Paso a buscarlos mañana a la mañana.",
  });
  await Message.create({
    order_id: orderMariaPepinos._id,
    sender_id: mario._id,
    content: "Perfecto! Te los tengo guardados.",
  });
  await Message.create({
    order_id: orderMariaPepinos._id,
    sender_id: maria._id,
    content: "Gracias, ya los retiré. Muy frescos!",
  });
  await Message.create({
    order_id: orderMariaPepinos._id,
    sender_id: mario._id,
    content: "Me alegra! Bienvenida cuando quieras.",
  });

  console.log("✅  12 mensajes creados");

  // --- Notifications ---
  await Notification.create([
    {
      user_id: mario._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Juan Pérez reservó Zanahorias baby 1kg",
      reference_id: orderJuanZanahorias._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: mario._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "María López reservó Pepinos x4",
      reference_id: orderMariaPepinos._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: mario._id,
      type: "RESERVATION_CANCELLED_BY_CONSUMER",
      title: "Reserva cancelada",
      message: "Pedro Fernández canceló su reserva de Leche entera x6",
      reference_id: null,
      reference_type: null,
      read: false,
    },
    {
      user_id: mario._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Juan Pérez te envió un mensaje",
      reference_id: orderJuanZanahorias._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: estrella._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Ana García reservó Bizcochos de grasa x10",
      reference_id: orderAnaBizcochos._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: estrella._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Pedro Fernández reservó Tarta de ricotta y espinaca",
      reference_id: orderPedroTarta._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: estrella._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Ana García te envió un mensaje",
      reference_id: orderAnaBizcochos._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: rincon._id,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Luis Martínez reservó Bebidas surtidas x6",
      reference_id: orderLuisBebidas._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: juan._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Verdulería Don Mario te envió un mensaje",
      reference_id: orderJuanZanahorias._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: maria._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Pepinos x4 fue marcado como entregado",
      reference_id: orderMariaPepinos._id,
      reference_type: "ORDER",
      read: true,
    },
    {
      user_id: pedro._id,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      message: "Tu pedido de Tarta de ricotta y espinaca fue marcado como entregado",
      reference_id: orderPedroTarta._id,
      reference_type: "ORDER",
      read: false,
    },
    {
      user_id: ana._id,
      type: "NEW_MESSAGE",
      title: "Nuevo mensaje",
      message: "Panadería La Estrella te envió un mensaje",
      reference_id: orderAnaBizcochos._id,
      reference_type: "ORDER",
      read: true,
    },
  ]);

  console.log("✅  12 notificaciones creadas");

  // --- Favorites ---
  await Favorite.create([
    { user_id: juan._id, publication_id: pubMedialunas._id },
    { user_id: juan._id, publication_id: pubTomates._id },
    { user_id: ana._id, publication_id: pubEspinacas._id },
    { user_id: ana._id, publication_id: pubLeche._id },
    { user_id: ana._id, publication_id: pubFacturas._id },
    { user_id: luis._id, publication_id: pubPanLactal._id },
  ]);

  console.log("✅  6 favoritos creados");

  await mongoose.disconnect();
  console.log("🔌  Desconectado");
  console.log("");
  console.log("🎉  Seed completo!");
  console.log("   Admin:       admin@balanzen.com  /  Admin123");
  console.log(
    "   Comercios:   mario@comercio.com | estrella@comercio.com | rincon@comercio.com  /  Test1234"
  );
  console.log("   Consumidores: juan | ana | luis | maria | pedro @mail.com  /  Test1234");
};

seed().catch((err) => {
  console.error("❌ Error en seed:", err.message);
  process.exit(1);
});
