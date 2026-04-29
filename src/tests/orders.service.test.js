import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { Publication } from "#models/publication.model.js";
import {
  createOrder,
  listOrders,
  getOrderById,
  cancelOrder,
  deliverOrder,
} from "#services/orders.service.js";

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
let categoryId;
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
  categoryId = cat.id;
  const pub = await createPublication(commerceId, {
    title: "Mix de verduras",
    description: "Tomate y lechuga",
    original_price: 2000,
    final_price: 1000,
    expiry_date: new Date(Date.now() + 86400000),
    category_id: categoryId,
  });
  pubId = pub.id;
};

describe("createOrder", () => {
  it("crea una reserva y cambia la publicación a RESERVED", async () => {
    await setup();
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
    await setup();
    await expect(createOrder(consumerId, "id-inexistente")).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 409 si la publicación no está ACTIVE", async () => {
    await setup();
    await createOrder(consumerId, pubId);
    await expect(createOrder(consumerId, pubId)).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 409 si ya existe una reserva activa", async () => {
    await setup();
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
    await setup();
    await createOrder(consumerId, pubId);
    const result = await listOrders(consumerId, "CONSUMIDOR", {});

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].commerce).toBeDefined();
  });

  it("comercio ve las reservas recibidas", async () => {
    await setup();
    await createOrder(consumerId, pubId);
    const result = await listOrders(commerceId, "COMERCIO", {});

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].consumer).toBeDefined();
  });

  it("filtra por status", async () => {
    await setup();
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
    await setup();
    const order = await createOrder(consumerId, pubId);
    const result = await getOrderById(order.id, consumerId);

    expect(result.id).toBe(order.id);
    expect(result.publication.id).toBe(pubId);
  });

  it("retorna el detalle del pedido para el comercio", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    const result = await getOrderById(order.id, commerceId);
    expect(result.id).toBe(order.id);
  });

  it("lanza 403 si el usuario no es parte del pedido", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await expect(getOrderById(order.id, "otro-id")).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 si el pedido no existe", async () => {
    await expect(getOrderById("id-inexistente", consumerId)).rejects.toMatchObject({ status: 404 });
  });
});

describe("cancelOrder", () => {
  it("cancela el pedido y devuelve la publicación a ACTIVE", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);

    const pub = await Publication.findById(pubId);
    expect(pub.status).toBe("ACTIVE");

    const result = await listOrders(consumerId, "CONSUMIDOR", { status: "CANCELLED" });
    expect(result.orders).toHaveLength(1);
  });

  it("el comercio también puede cancelar", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, commerceId);

    const pub = await Publication.findById(pubId);
    expect(pub.status).toBe("ACTIVE");
  });

  it("lanza 409 si el pedido no está RESERVED", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);
    await expect(cancelOrder(order.id, consumerId)).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 403 si el usuario no es parte del pedido", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await expect(cancelOrder(order.id, "otro-id")).rejects.toMatchObject({ status: 403 });
  });
});

describe("deliverOrder", () => {
  it("marca el pedido como entregado y la publicación pasa a DELIVERED", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await deliverOrder(order.id, commerceId);

    const pub = await Publication.findById(pubId);
    expect(pub.status).toBe("DELIVERED");

    const result = await listOrders(consumerId, "CONSUMIDOR", { status: "DELIVERED" });
    expect(result.orders).toHaveLength(1);
  });

  it("lanza 403 si no es el comercio owner", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await expect(deliverOrder(order.id, "otro-id")).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 409 si el pedido no está RESERVED", async () => {
    await setup();
    const order = await createOrder(consumerId, pubId);
    await cancelOrder(order.id, consumerId);
    await expect(deliverOrder(order.id, commerceId)).rejects.toMatchObject({ status: 409 });
  });
});
