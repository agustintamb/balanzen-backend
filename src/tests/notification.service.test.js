import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { createOrder, cancelOrder, deliverOrder } from "#services/orders.service.js";
import { sendMessage } from "#services/chat.service.js";
import { createNotification, listNotifications } from "#services/notification.service.js";

const COMERCIO_DATA = {
  role: "COMERCIO",
  first_name: "María",
  last_name: "López",
  email: "maria@comercio.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1144556677",
  dni: "30987654",
  business_name: "Verdulería Don Mario",
  cuit: "20309876543",
  address: {
    formatted_address: "Av. Corrientes 1234, CABA",
    street: "Av. Corrientes",
    number: "1234",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6037,
    lng: -58.3816,
  },
};

const CONSUMIDOR_DATA = {
  role: "CONSUMIDOR",
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@mail.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1155667788",
  dni: "35123456",
};

let commerceId;
let consumerId;
let pubId;

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const setup = async () => {
  const [commerce, consumer] = await Promise.all([
    register(COMERCIO_DATA),
    register(CONSUMIDOR_DATA),
  ]);
  commerceId = commerce.id;
  consumerId = consumer.id;
  const cat = await createCategory({ name: "Verduras" });
  const pub = await createPublication(commerceId, {
    title: "Mix de verduras",
    description: "Tomate y lechuga",
    original_price: 2000,
    final_price: 1000,
    expiry_date: new Date(Date.now() + 86400000),
    category_id: cat.id,
  });
  pubId = pub.id;
};

describe("createNotification", () => {
  it("crea una notificación correctamente", async () => {
    await setup();
    const notif = await createNotification({
      userId: commerceId,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: 'Tu publicación "Mix de verduras" fue reservada.',
      referenceId: "order-id",
      referenceType: "ORDER",
    });

    expect(notif._id).toBeDefined();
    expect(notif.user_id).toBe(commerceId);
    expect(notif.read).toBe(false);
  });
});

describe("listNotifications", () => {
  it("retorna notificaciones del usuario con unread_count", async () => {
    await setup();
    await createNotification({
      userId: commerceId,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Reserva recibida.",
    });

    const result = await listNotifications(commerceId, {});
    expect(result.notifications).toHaveLength(1);
    expect(result.unread_count).toBe(1);
    expect(result.pagination.total).toBe(1);
  });

  it("filtra por read=false", async () => {
    await setup();
    await createNotification({
      userId: consumerId,
      type: "ORDER_DELIVERED",
      title: "Entregado",
      message: "Pedido entregado.",
    });

    const unread = await listNotifications(consumerId, { read: "false" });
    const read = await listNotifications(consumerId, { read: "true" });

    expect(unread.notifications).toHaveLength(1);
    expect(read.notifications).toHaveLength(0);
  });

  it("retorna lista vacía si el usuario no tiene notificaciones", async () => {
    await setup();
    const result = await listNotifications(consumerId, {});
    expect(result.notifications).toHaveLength(0);
    expect(result.unread_count).toBe(0);
  });
});

describe("triggers automáticos desde orders.service", () => {
  it("createOrder genera NEW_RESERVATION para el comercio", async () => {
    await setup();
    await createOrder(consumerId, pubId);

    const result = await listNotifications(commerceId, {});
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].type).toBe("NEW_RESERVATION");
  });

  it("cancelOrder por consumidor genera RESERVATION_CANCELLED_BY_CONSUMER para el comercio", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);

    const result = await listNotifications(commerceId, {});
    const types = result.notifications.map((n) => n.type);
    expect(types).toContain("RESERVATION_CANCELLED_BY_CONSUMER");
  });

  it("cancelOrder por comercio genera RESERVATION_CANCELLED_BY_COMMERCE para el consumidor", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, commerceId);

    const result = await listNotifications(consumerId, {});
    const types = result.notifications.map((n) => n.type);
    expect(types).toContain("RESERVATION_CANCELLED_BY_COMMERCE");
  });

  it("deliverOrder genera ORDER_DELIVERED para el consumidor", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await deliverOrder(order.id, commerceId);

    const result = await listNotifications(consumerId, {});
    const types = result.notifications.map((n) => n.type);
    expect(types).toContain("ORDER_DELIVERED");
  });
});

describe("triggers automáticos desde chat.service", () => {
  it("sendMessage genera NEW_MESSAGE para la contraparte", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await sendMessage(order.id, consumerId, "Hola!");

    const result = await listNotifications(commerceId, {});
    const types = result.notifications.map((n) => n.type);
    expect(types).toContain("NEW_MESSAGE");
  });
});
