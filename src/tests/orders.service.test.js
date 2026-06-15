import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { Publication } from "#models/publication.model.js";
import { Address } from "#models/address.model.js";
import {
  createOrder,
  listOrders,
  getOrderById,
  cancelOrder,
  deliverOrder,
  listAllOrders,
} from "#services/orders.service.js";
import { CONSUMIDOR_DATA, setupWithPublication } from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("createOrder", () => {
  it("crea una reserva y cambia la publicación a RESERVED", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);

    expect(order.id).toBeDefined();
    expect(order.status).toBe("RESERVED");
    expect(order.publication.id).toBe(pubId);
    expect(order.consumer.first_name).toBe("Juan");
    expect(order.commerce.business_name).toBe("Verdulería Don Mario");

    const pub = await Publication.findById(pubId);
    expect(pub.status).toBe("RESERVED");
  });

  it("lanza 404 si la publicación no existe", async () => {
    const { consumerId } = await setupWithPublication();
    await expect(createOrder(consumerId, "id-inexistente")).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 409 si la publicación no está ACTIVE", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    await expect(createOrder(consumerId, pubId)).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 409 si ya existe una reserva activa", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const consumer2 = await register({
      ...CONSUMIDOR_DATA,
      email: "otro@mail.com",
      dni: "11111111",
    });
    await expect(createOrder(consumer2.id, pubId)).rejects.toMatchObject({ status: 409 });
  });
});

describe("listOrders", () => {
  it("consumidor ve sus propias reservas", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listOrders(consumerId, "CONSUMIDOR", {});

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].commerce).toBeDefined();
  });

  it("comercio ve las reservas recibidas", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listOrders(commerceId, "COMERCIO", {});

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].consumer).toBeDefined();
  });

  it("filtra por status", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);

    const active = await listOrders(consumerId, "CONSUMIDOR", { status: "RESERVED" });
    const cancelled = await listOrders(consumerId, "CONSUMIDOR", { status: "CANCELLED" });

    expect(active.orders).toHaveLength(0);
    expect(cancelled.orders).toHaveLength(1);
  });
});

describe("getOrderById", () => {
  it("retorna el detalle del pedido para el consumidor", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    const result = await getOrderById(order.id, consumerId);

    expect(result.id).toBe(order.id);
    expect(result.publication.id).toBe(pubId);
  });

  it("embebe la publicación completa y el avatar del consumer", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    await Address.create({
      user_id: commerceId,
      formatted_address: "Av. Corrientes 1234, CABA",
      street: "Av. Corrientes",
      number: "1234",
      city: "CABA",
      province: "Buenos Aires",
      lat: -34.6037,
      lng: -58.3816,
      is_selected: true,
    });
    const order = await createOrder(consumerId, pubId);
    const result = await getOrderById(order.id, consumerId);

    expect(result.publication.description).toBeDefined();
    expect(result.publication.original_price).toBe(2000);
    expect(result.publication.final_price).toBe(1000);
    expect(result.publication.discount_pct).toBe(50);
    expect(result.publication.expiry_date).toBeDefined();
    expect(result.publication.category.name).toBe("Verduras");
    expect(result.publication.commerce.selected_address.lat).toBe(-34.6037);
    expect(result.publication.commerce.selected_address.lng).toBe(-58.3816);
    expect(result.publication.commerce.first_name).toBe("María");
    expect(result.publication.commerce.last_name).toBe("López");
    expect(result.publication.commerce.phone).toBe("1144556677");
    expect(result.consumer).toHaveProperty("photo_url");
    expect(result.consumer.phone).toBe("1155667788");
  });

  it("retorna el detalle del pedido para el comercio", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    const result = await getOrderById(order.id, commerceId);
    expect(result.id).toBe(order.id);
  });

  it("lanza 403 si el usuario no es parte del pedido", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await expect(getOrderById(order.id, "otro-id")).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 si el pedido no existe", async () => {
    await expect(getOrderById("id-inexistente", "any-id")).rejects.toMatchObject({ status: 404 });
  });
});

describe("cancelOrder", () => {
  it("cancela el pedido y devuelve la publicación a ACTIVE", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);

    const pub = await Publication.findById(pubId);
    expect(pub.status).toBe("ACTIVE");

    const result = await listOrders(consumerId, "CONSUMIDOR", { status: "CANCELLED" });
    expect(result.orders).toHaveLength(1);
  });

  it("el comercio también puede cancelar", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, commerceId);

    const pub = await Publication.findById(pubId);
    expect(pub.status).toBe("ACTIVE");
  });

  it("lanza 409 si el pedido no está RESERVED", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);
    await expect(cancelOrder(order.id, consumerId)).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 403 si el usuario no es parte del pedido", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await expect(cancelOrder(order.id, "otro-id")).rejects.toMatchObject({ status: 403 });
  });
});

describe("listOrders - filtros de fecha", () => {
  const PAST = new Date(0).toISOString();
  const FUTURE = new Date("2099-12-31").toISOString();

  it("date_from en el pasado incluye órdenes recientes", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listOrders(consumerId, "CONSUMIDOR", { date_from: PAST });
    expect(result.orders).toHaveLength(1);
  });

  it("date_to en el futuro incluye órdenes recientes", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listOrders(consumerId, "CONSUMIDOR", { date_to: FUTURE });
    expect(result.orders).toHaveLength(1);
  });

  it("date_from en el futuro excluye órdenes recientes", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listOrders(consumerId, "CONSUMIDOR", { date_from: FUTURE });
    expect(result.orders).toHaveLength(0);
  });

  it("date_to en el pasado excluye órdenes recientes", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listOrders(consumerId, "CONSUMIDOR", { date_to: PAST });
    expect(result.orders).toHaveLength(0);
  });

  it("rango válido (pasado–futuro) incluye órdenes recientes", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listOrders(consumerId, "CONSUMIDOR", { date_from: PAST, date_to: FUTURE });
    expect(result.orders).toHaveLength(1);
  });
});

describe("listAllOrders - filtros de fecha", () => {
  const PAST = new Date(0).toISOString();
  const FUTURE = new Date("2099-12-31").toISOString();

  it("date_from en el pasado incluye órdenes recientes", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listAllOrders({ date_from: PAST });
    expect(result.orders).toHaveLength(1);
  });

  it("date_from en el futuro excluye órdenes recientes", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await createOrder(consumerId, pubId);
    const result = await listAllOrders({ date_from: FUTURE });
    expect(result.orders).toHaveLength(0);
  });
});

describe("deliverOrder", () => {
  it("marca el pedido como entregado y la publicación pasa a DELIVERED", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await deliverOrder(order.id, commerceId);

    const pub = await Publication.findById(pubId);
    expect(pub.status).toBe("DELIVERED");

    const result = await listOrders(consumerId, "CONSUMIDOR", { status: "DELIVERED" });
    expect(result.orders).toHaveLength(1);
  });

  it("lanza 403 si no es el comercio owner", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await expect(deliverOrder(order.id, "otro-id")).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 409 si el pedido no está RESERVED", async () => {
    const { commerceId, consumerId, pubId } = await setupWithPublication();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);
    await expect(deliverOrder(order.id, commerceId)).rejects.toMatchObject({ status: 409 });
  });
});
