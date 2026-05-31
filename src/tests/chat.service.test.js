import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { cancelOrder } from "#services/orders.service.js";
import { listChats, getMessages, sendMessage } from "#services/chat.service.js";
import { CONSUMIDOR_DATA, setupWithOrder } from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("sendMessage", () => {
  it("envía un mensaje correctamente en un pedido RESERVED", async () => {
    const { orderId, consumerId } = await setupWithOrder();
    const msg = await sendMessage(orderId, consumerId, "Hola, paso a las 18hs");

    expect(msg.id).toBeDefined();
    expect(msg.content).toBe("Hola, paso a las 18hs");
    expect(msg.sender_id).toBe(consumerId);
    expect(msg.order_id).toBe(orderId);
  });

  it("el comercio también puede enviar mensajes", async () => {
    const { orderId, commerceId } = await setupWithOrder();
    const msg = await sendMessage(orderId, commerceId, "Dale, te espero");
    expect(msg.sender_id).toBe(commerceId);
  });

  it("lanza 409 si el pedido no está RESERVED", async () => {
    const { orderId, consumerId } = await setupWithOrder();
    await cancelOrder(orderId, consumerId);
    await expect(sendMessage(orderId, consumerId, "texto")).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 403 si el usuario no es parte del pedido", async () => {
    const { orderId } = await setupWithOrder();
    await expect(sendMessage(orderId, "otro-id", "texto")).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 si el pedido no existe", async () => {
    const { consumerId } = await setupWithOrder();
    await expect(sendMessage("id-inexistente", consumerId, "texto")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("getMessages", () => {
  it("retorna mensajes paginados del chat", async () => {
    const { orderId, consumerId, commerceId } = await setupWithOrder();
    await sendMessage(orderId, consumerId, "Mensaje 1");
    await sendMessage(orderId, commerceId, "Mensaje 2");

    const result = await getMessages(orderId, consumerId, {});
    expect(result.messages).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it("retorna lista vacía si no hay mensajes", async () => {
    const { orderId, consumerId } = await setupWithOrder();
    const result = await getMessages(orderId, consumerId, {});
    expect(result.messages).toHaveLength(0);
  });

  it("lanza 403 si el usuario no tiene acceso", async () => {
    const { orderId } = await setupWithOrder();
    await expect(getMessages(orderId, "otro-id", {})).rejects.toMatchObject({ status: 403 });
  });
});

describe("listChats", () => {
  it("retorna el chat del consumidor con contraparte y publicación", async () => {
    const { orderId, consumerId } = await setupWithOrder();
    await sendMessage(orderId, consumerId, "Hola");

    const result = await listChats(consumerId);
    expect(result.chats).toHaveLength(1);
    expect(result.chats[0].order_id).toBe(orderId);
    expect(result.chats[0].counterpart.business_name).toBe("Verdulería Don Mario");
    expect(result.chats[0].last_message.content).toBe("Hola");
    expect(result.chats[0].publication_title).toBe("Mix de verduras");
  });

  it("retorna el chat del comercio con el consumidor como contraparte", async () => {
    const { commerceId } = await setupWithOrder();
    const result = await listChats(commerceId);
    expect(result.chats).toHaveLength(1);
    expect(result.chats[0].counterpart.first_name).toBe("Juan");
  });

  it("retorna lista vacía si el usuario no tiene chats", async () => {
    await setupWithOrder();
    const other = await register({ ...CONSUMIDOR_DATA, email: "otro@mail.com", dni: "99999999" });
    const result = await listChats(other.id);
    expect(result.chats).toHaveLength(0);
  });
});
