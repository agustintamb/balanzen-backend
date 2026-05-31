import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { createOrder, cancelOrder, deliverOrder } from "#services/orders.service.js";
import { sendMessage } from "#services/chat.service.js";
import { createNotification, listNotifications } from "#services/notification.service.js";
import { setupWithPublication } from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("createNotification", () => {
  it("crea una notificación correctamente", async () => {
    const { commerceId } = await setupWithPublication();
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
    const { commerceId } = await setupWithPublication();
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
    const { consumerId } = await setupWithPublication();
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
    const { consumerId } = await setupWithPublication();
    const result = await listNotifications(consumerId, {});
    expect(result.notifications).toHaveLength(0);
    expect(result.unread_count).toBe(0);
  });
});

describe("triggers automáticos desde orders.service", () => {
  it("createOrder genera NEW_RESERVATION para el comercio", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);

    const result = await listNotifications(commerceId, {});
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].type).toBe("NEW_RESERVATION");
  });

  it("cancelOrder por consumidor genera RESERVATION_CANCELLED_BY_CONSUMER para el comercio", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);

    const result = await listNotifications(commerceId, {});
    const types = result.notifications.map((n) => n.type);
    expect(types).toContain("RESERVATION_CANCELLED_BY_CONSUMER");
  });

  it("cancelOrder por comercio genera RESERVATION_CANCELLED_BY_COMMERCE para el consumidor", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, commerceId);

    const result = await listNotifications(consumerId, {});
    const types = result.notifications.map((n) => n.type);
    expect(types).toContain("RESERVATION_CANCELLED_BY_COMMERCE");
  });

  it("deliverOrder genera ORDER_DELIVERED para el consumidor", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await deliverOrder(order.id, commerceId);

    const result = await listNotifications(consumerId, {});
    const types = result.notifications.map((n) => n.type);
    expect(types).toContain("ORDER_DELIVERED");
  });
});

describe("triggers automáticos desde chat.service", () => {
  it("sendMessage genera NEW_MESSAGE para la contraparte", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await sendMessage(order.id, consumerId, "Hola!");

    const result = await listNotifications(commerceId, {});
    const types = result.notifications.map((n) => n.type);
    expect(types).toContain("NEW_MESSAGE");
  });
});
