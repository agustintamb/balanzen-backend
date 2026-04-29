import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { createOrder, cancelOrder } from "#services/orders.service.js";
import { listChats, getMessages, sendMessage } from "#services/chat.service.js";

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
let orderId;

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
  const order = await createOrder(consumerId, pub.id);
  orderId = order.id;
};

describe("sendMessage", () => {
  it("envía un mensaje correctamente en un pedido RESERVED", async () => {
    await setup();
    const msg = await sendMessage(orderId, consumerId, "Hola, paso a las 18hs");

    expect(msg.id).toBeDefined();
    expect(msg.content).toBe("Hola, paso a las 18hs");
    expect(msg.sender_id).toBe(consumerId);
    expect(msg.order_id).toBe(orderId);
  });

  it("el comercio también puede enviar mensajes", async () => {
    await setup();
    const msg = await sendMessage(orderId, commerceId, "Dale, te espero");
    expect(msg.sender_id).toBe(commerceId);
  });

  it("lanza 409 si el pedido no está RESERVED", async () => {
    await setup();
    await cancelOrder(orderId, consumerId);
    await expect(sendMessage(orderId, consumerId, "texto")).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 403 si el usuario no es parte del pedido", async () => {
    await setup();
    await expect(sendMessage(orderId, "otro-id", "texto")).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 si el pedido no existe", async () => {
    await setup();
    await expect(sendMessage("id-inexistente", consumerId, "texto")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("getMessages", () => {
  it("retorna mensajes paginados del chat", async () => {
    await setup();
    await sendMessage(orderId, consumerId, "Mensaje 1");
    await sendMessage(orderId, commerceId, "Mensaje 2");

    const result = await getMessages(orderId, consumerId, {});
    expect(result.messages).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it("retorna lista vacía si no hay mensajes", async () => {
    await setup();
    const result = await getMessages(orderId, consumerId, {});
    expect(result.messages).toHaveLength(0);
  });

  it("lanza 403 si el usuario no tiene acceso", async () => {
    await setup();
    await expect(getMessages(orderId, "otro-id", {})).rejects.toMatchObject({ status: 403 });
  });
});

describe("listChats", () => {
  it("retorna el chat del consumidor con contraparte y publicación", async () => {
    await setup();
    await sendMessage(orderId, consumerId, "Hola");

    const result = await listChats(consumerId);
    expect(result.chats).toHaveLength(1);
    expect(result.chats[0].order_id).toBe(orderId);
    expect(result.chats[0].counterpart.business_name).toBe("Verdulería Don Mario");
    expect(result.chats[0].last_message.content).toBe("Hola");
    expect(result.chats[0].publication_title).toBe("Mix de verduras");
  });

  it("retorna el chat del comercio con el consumidor como contraparte", async () => {
    await setup();
    const result = await listChats(commerceId);
    expect(result.chats).toHaveLength(1);
    expect(result.chats[0].counterpart.first_name).toBe("Juan");
  });

  it("retorna lista vacía si el usuario no tiene chats", async () => {
    await setup();
    const other = await register({ ...CONSUMIDOR_DATA, email: "otro@mail.com", dni: "99999999" });
    const result = await listChats(other.id);
    expect(result.chats).toHaveLength(0);
  });
});
