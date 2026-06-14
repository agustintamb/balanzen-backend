import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "#app.js";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { authConsumer, authCommerce, bearer } from "#tests/helpers/auth.helper.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const setupWithPub = async () => {
  const commerce = await authCommerce();
  const consumer = await authConsumer();
  const cat = await createCategory({ name: "Verduras" });
  const pub = await createPublication(commerce.id, {
    title: "Mix de verduras",
    description: "Tomate y lechuga",
    original_price: 2000,
    final_price: 1000,
    expiry_date: new Date(Date.now() + 86400000),
    category_id: cat.id,
  });
  return { commerce, consumer, pubId: pub.id };
};

const createOrderViaApi = async (consumer, pubId) => {
  const res = await request(app)
    .post("/api/v1/orders")
    .set("Authorization", bearer(consumer.token))
    .send({ publication_id: pubId });
  return res;
};

describe("POST /api/v1/orders", () => {
  it("crea una reserva como CONSUMIDOR (201)", async () => {
    const { consumer, pubId } = await setupWithPub();
    const res = await createOrderViaApi(consumer, pubId);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("RESERVED");
  });

  it("devuelve 403 si lo intenta un COMERCIO", async () => {
    const { commerce, pubId } = await setupWithPub();
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", bearer(commerce.token))
      .send({ publication_id: pubId });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta publication_id (validate)", async () => {
    const { consumer } = await setupWithPub();
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", bearer(consumer.token))
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/orders y /:id", () => {
  it("lista los pedidos del usuario y trae el detalle", async () => {
    const { consumer, pubId } = await setupWithPub();
    const created = await createOrderViaApi(consumer, pubId);
    const orderId = created.body.id;

    const list = await request(app)
      .get("/api/v1/orders")
      .set("Authorization", bearer(consumer.token));
    expect(list.status).toBe(200);
    expect(list.body.orders).toHaveLength(1);

    const detail = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", bearer(consumer.token));
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(orderId);
  });

  it("devuelve 404 si el pedido no existe", async () => {
    const { consumer } = await setupWithPub();
    const res = await request(app)
      .get("/api/v1/orders/inexistente")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/orders/:id/cancel y /deliver", () => {
  it("el consumidor cancela su reserva (200)", async () => {
    const { consumer, pubId } = await setupWithPub();
    const created = await createOrderViaApi(consumer, pubId);
    const res = await request(app)
      .put(`/api/v1/orders/${created.body.id}/cancel`)
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(200);
  });

  it("el comercio marca la reserva como entregada (200)", async () => {
    const { commerce, consumer, pubId } = await setupWithPub();
    const created = await createOrderViaApi(consumer, pubId);
    const res = await request(app)
      .put(`/api/v1/orders/${created.body.id}/deliver`)
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(200);
  });

  it("devuelve 403 si un consumidor intenta marcar entregado", async () => {
    const { consumer, pubId } = await setupWithPub();
    const created = await createOrderViaApi(consumer, pubId);
    const res = await request(app)
      .put(`/api/v1/orders/${created.body.id}/deliver`)
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(403);
  });
});
