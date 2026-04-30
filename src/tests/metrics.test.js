import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { createOrder, deliverOrder, cancelOrder } from "#services/orders.service.js";
import { getCommerceSummary } from "#services/metrics.service.js";

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

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const createPub = async (catId) =>
  createPublication(commerceId, {
    title: "Producto",
    description: "Descripción",
    original_price: 2000,
    final_price: 1000,
    expiry_date: new Date(Date.now() + 86400000),
    category_id: catId,
  });

const setup = async () => {
  const [commerce, consumer] = await Promise.all([
    register(COMERCIO_DATA),
    register(CONSUMIDOR_DATA),
  ]);
  commerceId = commerce.id;
  consumerId = consumer.id;
};

describe("getCommerceSummary", () => {
  it("retorna todo en 0 si el comercio no tiene publicaciones ni pedidos", async () => {
    await setup();
    const result = await getCommerceSummary(commerceId);

    expect(result.total_publications).toBe(0);
    expect(result.active_publications).toBe(0);
    expect(result.total_reservations).toBe(0);
    expect(result.total_delivered).toBe(0);
    expect(result.total_cancelled).toBe(0);
    expect(result.conversion_rate).toBe(0);
  });

  it("calcula métricas correctamente con publicaciones y pedidos", async () => {
    await setup();
    const cat = await createCategory({ name: "Verduras" });

    await createPub(cat.id);
    const [pub1, pub2] = await Promise.all([createPub(cat.id), createPub(cat.id)]);

    const [order1, order2] = await Promise.all([
      createOrder(consumerId, pub1.id),
      createOrder(consumerId, pub2.id),
    ]);

    await deliverOrder(order1.id, commerceId);
    await cancelOrder(order2.id, consumerId);

    const result = await getCommerceSummary(commerceId);

    expect(result.total_publications).toBe(3);
    expect(result.active_publications).toBe(2);
    expect(result.total_reservations).toBe(2);
    expect(result.total_delivered).toBe(1);
    expect(result.total_cancelled).toBe(1);
    expect(result.conversion_rate).toBe(50);
  });
});
