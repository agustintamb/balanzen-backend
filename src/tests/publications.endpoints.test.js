import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "#app.js";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { authConsumer, authCommerce, bearer } from "#tests/helpers/auth.helper.js";
import { createCategory } from "#services/categories.service.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const pubBody = (categoryId) => ({
  title: "Pan del día",
  description: "Pan fresco con descuento",
  original_price: 1000,
  final_price: 500,
  expiry_date: new Date(Date.now() + 86400000).toISOString(),
  category_id: categoryId,
});

const setup = async () => {
  const commerce = await authCommerce();
  const consumer = await authConsumer();
  const cat = await createCategory({ name: "Panadería" });
  return { commerce, consumer, catId: cat.id };
};

describe("POST /api/v1/publications", () => {
  it("crea una publicación como COMERCIO (201)", async () => {
    const { commerce, catId } = await setup();
    const res = await request(app)
      .post("/api/v1/publications")
      .set("Authorization", bearer(commerce.token))
      .send(pubBody(catId));
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Pan del día");
    expect(res.body.discount_pct).toBe(50);
  });

  it("acepta una donación gratuita con precios en 0 (201)", async () => {
    const { commerce, catId } = await setup();
    const res = await request(app)
      .post("/api/v1/publications")
      .set("Authorization", bearer(commerce.token))
      .send({ ...pubBody(catId), original_price: 0, final_price: 0 });
    expect(res.status).toBe(201);
    expect(res.body.is_donation).toBe(true);
    expect(res.body.discount_pct).toBe(0);
  });

  it("devuelve 403 si lo intenta un CONSUMIDOR (role middleware)", async () => {
    const { consumer, catId } = await setup();
    const res = await request(app)
      .post("/api/v1/publications")
      .set("Authorization", bearer(consumer.token))
      .send(pubBody(catId));
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta un campo requerido (validate)", async () => {
    const { commerce } = await setup();
    const res = await request(app)
      .post("/api/v1/publications")
      .set("Authorization", bearer(commerce.token))
      .send({ description: "sin title ni precio" });
    expect(res.status).toBe(400);
  });

  it("devuelve 401 sin token", async () => {
    const res = await request(app).post("/api/v1/publications").send({});
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/publications", () => {
  it("lista publicaciones activas como CONSUMIDOR (200)", async () => {
    const { commerce, consumer, catId } = await setup();
    await request(app)
      .post("/api/v1/publications")
      .set("Authorization", bearer(commerce.token))
      .send(pubBody(catId));

    const res = await request(app)
      .get("/api/v1/publications")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(200);
    expect(res.body.publications).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });
});

describe("GET /api/v1/publications/me", () => {
  it("lista las publicaciones del comercio con filtros de fecha", async () => {
    const { commerce, catId } = await setup();
    await request(app)
      .post("/api/v1/publications")
      .set("Authorization", bearer(commerce.token))
      .send(pubBody(catId));

    const res = await request(app)
      .get("/api/v1/publications/me")
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(200);
    expect(res.body.publications).toHaveLength(1);
  });

  it("devuelve 400 si date_from no es ISO 8601 (date-range validator)", async () => {
    const { commerce } = await setup();
    const res = await request(app)
      .get("/api/v1/publications/me?date_from=no-es-fecha")
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(400);
  });
});

describe("GET / PUT / DELETE /api/v1/publications/:id", () => {
  const createPub = async (commerce, catId) => {
    const res = await request(app)
      .post("/api/v1/publications")
      .set("Authorization", bearer(commerce.token))
      .send(pubBody(catId));
    return res.body.id;
  };

  it("devuelve el detalle (200) y 404 si no existe", async () => {
    const { commerce, consumer, catId } = await setup();
    const id = await createPub(commerce, catId);

    const ok = await request(app)
      .get(`/api/v1/publications/${id}`)
      .set("Authorization", bearer(consumer.token));
    expect(ok.status).toBe(200);

    const notFound = await request(app)
      .get("/api/v1/publications/inexistente")
      .set("Authorization", bearer(consumer.token));
    expect(notFound.status).toBe(404);
  });

  it("edita la publicación propia (200)", async () => {
    const { commerce, catId } = await setup();
    const id = await createPub(commerce, catId);
    const res = await request(app)
      .put(`/api/v1/publications/${id}`)
      .set("Authorization", bearer(commerce.token))
      .send({ title: "Pan editado" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Pan editado");
  });

  it("devuelve 403 al editar publicación de otro comercio", async () => {
    const { commerce, catId } = await setup();
    const id = await createPub(commerce, catId);
    const otro = await authCommerce({ email: "otro@comercio.com", cuit: "20111111111" });
    const res = await request(app)
      .put(`/api/v1/publications/${id}`)
      .set("Authorization", bearer(otro.token))
      .send({ title: "Hackeo" });
    expect(res.status).toBe(403);
  });

  it("da de baja la publicación propia (200)", async () => {
    const { commerce, catId } = await setup();
    const id = await createPub(commerce, catId);
    const res = await request(app)
      .delete(`/api/v1/publications/${id}`)
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(200);
  });

  it("devuelve el detalle de una publicación cancelada/soft-deleted (200)", async () => {
    const { commerce, catId } = await setup();
    const id = await createPub(commerce, catId);
    await request(app)
      .delete(`/api/v1/publications/${id}`)
      .set("Authorization", bearer(commerce.token));

    const res = await request(app)
      .get(`/api/v1/publications/${id}`)
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
  });
});
