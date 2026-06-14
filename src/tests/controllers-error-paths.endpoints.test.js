import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import app from "#app.js";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { authConsumer, authCommerce, authAdmin, bearer } from "#tests/helpers/auth.helper.js";

import * as addressesService from "#services/addresses.service.js";
import * as adminService from "#services/admin.service.js";
import * as authService from "#services/auth.service.js";
import * as categoriesService from "#services/categories.service.js";
import * as chatService from "#services/chat.service.js";
import * as favoritesService from "#services/favorites.service.js";
import * as metricsService from "#services/metrics.service.js";
import * as notificationService from "#services/notification.service.js";
import * as ordersService from "#services/orders.service.js";
import * as publicationsService from "#services/publications.service.js";
import * as usersService from "#services/users.service.js";
import * as uploadsService from "#services/uploads.service.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await clearDB();
});

const boom = () => Object.assign(new Error("boom"), {});

// ─── Catches alcanzables con errores REALES (id inexistente / conflicto) ───────
describe("controller catches - errores reales", () => {
  it("addresses: search 502, create 409, update 404, delete ok+404, select 404", async () => {
    const consumer = await authConsumer();
    const t = bearer(consumer.token);
    const ADDR = {
      formatted_address: "Av. Corrientes 1234",
      street: "Corrientes",
      number: "1234",
      city: "CABA",
      province: "BA",
      lat: -34.6,
      lng: -58.3,
    };

    // search -> 502 (fetch falla)
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 500 }));
    expect(
      (await request(app).get("/api/v1/addresses/search?q=x").set("Authorization", t)).status
    ).toBe(502);
    vi.unstubAllGlobals();

    // create duplicado -> 409
    await request(app).post("/api/v1/addresses").set("Authorization", t).send(ADDR);
    const dup = await request(app).post("/api/v1/addresses").set("Authorization", t).send(ADDR);
    expect(dup.status).toBe(409);

    // crea una segunda para poder borrar la primera (no seleccionada)
    const second = await request(app)
      .post("/api/v1/addresses")
      .set("Authorization", t)
      .send({ ...ADDR, lat: -34.7, lng: -58.4 });

    // update 404
    expect(
      (await request(app).put("/api/v1/addresses/nope").set("Authorization", t).send({ city: "X" }))
        .status
    ).toBe(404);
    // delete ok (hay 2, no seleccionada) + 404
    expect(
      (await request(app).delete(`/api/v1/addresses/${second.body.id}`).set("Authorization", t))
        .status
    ).toBe(200);
    expect(
      (await request(app).delete("/api/v1/addresses/nope").set("Authorization", t)).status
    ).toBe(404);
    // select 404
    expect(
      (await request(app).put("/api/v1/addresses/nope/select").set("Authorization", t)).status
    ).toBe(404);
  });

  it("admin: create 409, update 404, delete 404, getUser 404", async () => {
    const admin = await authAdmin();
    const t = bearer(admin.token);
    await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", t)
      .send({ name: "Dup" });
    expect(
      (
        await request(app)
          .post("/api/v1/admin/categories")
          .set("Authorization", t)
          .send({ name: "Dup" })
      ).status
    ).toBe(409);
    expect(
      (
        await request(app)
          .put("/api/v1/admin/categories/nope")
          .set("Authorization", t)
          .send({ name: "X" })
      ).status
    ).toBe(404);
    expect(
      (await request(app).delete("/api/v1/admin/categories/nope").set("Authorization", t)).status
    ).toBe(404);
    expect(
      (await request(app).get("/api/v1/admin/users/nope").set("Authorization", t)).status
    ).toBe(404);
  });

  it("auth: refresh 401 con token inválido", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Authorization", bearer(consumer.token))
      .send({ refresh_token: "invalido" });
    expect(res.status).toBe(401);
  });

  it("chat: getMessages 404 y sendMessage 404 con orden inexistente", async () => {
    const consumer = await authConsumer();
    const t = bearer(consumer.token);
    expect(
      (await request(app).get("/api/v1/chats/nope/messages").set("Authorization", t)).status
    ).toBe(404);
    expect(
      (
        await request(app)
          .post("/api/v1/chats/nope/messages")
          .set("Authorization", t)
          .send({ content: "hola" })
      ).status
    ).toBe(404);
  });

  it("favorites: add 404 y remove 404", async () => {
    const consumer = await authConsumer();
    const t = bearer(consumer.token);
    expect((await request(app).post("/api/v1/favorites/nope").set("Authorization", t)).status).toBe(
      404
    );
    expect(
      (await request(app).delete("/api/v1/favorites/nope").set("Authorization", t)).status
    ).toBe(404);
  });

  it("orders: create 404, cancel 404, deliver 404", async () => {
    const consumer = await authConsumer();
    const commerce = await authCommerce();
    expect(
      (
        await request(app)
          .post("/api/v1/orders")
          .set("Authorization", bearer(consumer.token))
          .send({ publication_id: "nope" })
      ).status
    ).toBe(404);
    expect(
      (
        await request(app)
          .put("/api/v1/orders/nope/cancel")
          .set("Authorization", bearer(consumer.token))
      ).status
    ).toBe(404);
    expect(
      (
        await request(app)
          .put("/api/v1/orders/nope/deliver")
          .set("Authorization", bearer(commerce.token))
      ).status
    ).toBe(404);
  });

  it("publications: create 404 (categoría) y delete 404", async () => {
    const commerce = await authCommerce();
    const t = bearer(commerce.token);
    const create = await request(app)
      .post("/api/v1/publications")
      .set("Authorization", t)
      .send({
        title: "x",
        description: "y",
        original_price: 100,
        final_price: 50,
        expiry_date: new Date(Date.now() + 86400000).toISOString(),
        category_id: "nope",
      });
    expect(create.status).toBe(404);
    expect(
      (await request(app).delete("/api/v1/publications/nope").set("Authorization", t)).status
    ).toBe(404);
  });

  it("users: getPublicProfile 404", async () => {
    const consumer = await authConsumer();
    expect(
      (
        await request(app)
          .get("/api/v1/users/nope/public")
          .set("Authorization", bearer(consumer.token))
      ).status
    ).toBe(404);
  });
});

// ─── Catches de handlers de LISTADO puro (se fuerza el rechazo del service) ────
describe("controller catches - handlers de listado (service mockeado)", () => {
  it("addresses GET (getMyAddresses)", async () => {
    const consumer = await authConsumer();
    vi.spyOn(addressesService, "getMyAddresses").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/addresses").set("Authorization", bearer(consumer.token)))
        .status
    ).toBe(500);
  });

  it("categories GET", async () => {
    const consumer = await authConsumer();
    vi.spyOn(categoriesService, "listCategories").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/categories").set("Authorization", bearer(consumer.token)))
        .status
    ).toBe(500);
  });

  it("users GET /me (getMyProfile)", async () => {
    const consumer = await authConsumer();
    vi.spyOn(usersService, "getMyProfile").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/users/me").set("Authorization", bearer(consumer.token)))
        .status
    ).toBe(500);
  });

  it("users PUT /me (updateMyProfile)", async () => {
    const consumer = await authConsumer();
    vi.spyOn(usersService, "updateMyProfile").mockRejectedValueOnce(boom());
    expect(
      (
        await request(app)
          .put("/api/v1/users/me")
          .set("Authorization", bearer(consumer.token))
          .send({ first_name: "X" })
      ).status
    ).toBe(500);
  });

  it("auth logout", async () => {
    const consumer = await authConsumer();
    vi.spyOn(authService, "logout").mockRejectedValueOnce(boom());
    expect(
      (await request(app).post("/api/v1/auth/logout").set("Authorization", bearer(consumer.token)))
        .status
    ).toBe(500);
  });

  it("orders GET (listOrders)", async () => {
    const consumer = await authConsumer();
    vi.spyOn(ordersService, "listOrders").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/orders").set("Authorization", bearer(consumer.token))).status
    ).toBe(500);
  });

  it("publications GET (listPublications) y GET /me (getMyPublications)", async () => {
    const consumer = await authConsumer();
    const commerce = await authCommerce();
    vi.spyOn(publicationsService, "listPublications").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/publications").set("Authorization", bearer(consumer.token)))
        .status
    ).toBe(500);
    vi.spyOn(publicationsService, "getMyPublications").mockRejectedValueOnce(boom());
    expect(
      (
        await request(app)
          .get("/api/v1/publications/me")
          .set("Authorization", bearer(commerce.token))
      ).status
    ).toBe(500);
  });

  it("favorites GET (listFavorites)", async () => {
    const consumer = await authConsumer();
    vi.spyOn(favoritesService, "listFavorites").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/favorites").set("Authorization", bearer(consumer.token)))
        .status
    ).toBe(500);
  });

  it("metrics GET (getCommerceSummary)", async () => {
    const commerce = await authCommerce();
    vi.spyOn(metricsService, "getCommerceSummary").mockRejectedValueOnce(boom());
    expect(
      (
        await request(app)
          .get("/api/v1/metrics/summary")
          .set("Authorization", bearer(commerce.token))
      ).status
    ).toBe(500);
  });

  it("notifications GET (listNotifications) y read-all (markAllAsRead)", async () => {
    const consumer = await authConsumer();
    vi.spyOn(notificationService, "listNotifications").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/notifications").set("Authorization", bearer(consumer.token)))
        .status
    ).toBe(500);
    vi.spyOn(notificationService, "markAllAsRead").mockRejectedValueOnce(boom());
    expect(
      (
        await request(app)
          .put("/api/v1/notifications/read-all")
          .set("Authorization", bearer(consumer.token))
      ).status
    ).toBe(500);
  });

  it("chat GET (listChats)", async () => {
    const consumer = await authConsumer();
    vi.spyOn(chatService, "listChats").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/chats").set("Authorization", bearer(consumer.token))).status
    ).toBe(500);
  });

  it("admin listados (publications, orders, users)", async () => {
    const admin = await authAdmin();
    const t = bearer(admin.token);
    vi.spyOn(publicationsService, "listAllPublications").mockRejectedValueOnce(boom());
    expect(
      (await request(app).get("/api/v1/admin/publications").set("Authorization", t)).status
    ).toBe(500);
    vi.spyOn(ordersService, "listAllOrders").mockRejectedValueOnce(boom());
    expect((await request(app).get("/api/v1/admin/orders").set("Authorization", t)).status).toBe(
      500
    );
    vi.spyOn(adminService, "listUsers").mockRejectedValueOnce(boom());
    expect((await request(app).get("/api/v1/admin/users").set("Authorization", t)).status).toBe(
      500
    );
  });

  it("uploads DELETE éxito (deleteImage)", async () => {
    const consumer = await authConsumer();
    vi.spyOn(uploadsService, "deleteImage").mockResolvedValueOnce(undefined);
    const res = await request(app)
      .delete("/api/v1/uploads/image")
      .set("Authorization", bearer(consumer.token))
      .send({ url: "https://res.cloudinary.com/demo/image/upload/v1/balanzen/x.jpg" });
    expect(res.status).toBe(200);
  });
});
