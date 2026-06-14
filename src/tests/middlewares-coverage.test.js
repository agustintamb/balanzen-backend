import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "#app.js";
import envConfig from "#config/env.config.js";
import roleMiddleware from "#middlewares/role.middleware.js";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { authCommerce, bearer } from "#tests/helpers/auth.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("roleMiddleware (unit)", () => {
  it("responde 401 si no hay req.user", () => {
    const res = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    const next = vi.fn();
    roleMiddleware(["COMERCIO"])({}, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("authMiddleware - token expirado", () => {
  it("responde 401 'Token expirado' con un JWT vencido", async () => {
    const expired = jwt.sign({ id: "x", role: "CONSUMIDOR" }, envConfig.jwt.secret, {
      expiresIn: "-1s",
    });
    const res = await request(app).get("/api/v1/users/me").set("Authorization", bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token expirado");
  });
});

describe("date-range validator (custom)", () => {
  it("acepta un rango válido (date_to >= date_from)", async () => {
    const commerce = await authCommerce();
    const res = await request(app)
      .get("/api/v1/publications/me?date_from=2024-01-01&date_to=2024-12-31")
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(200);
  });

  it("rechaza con 400 si date_to < date_from", async () => {
    const commerce = await authCommerce();
    const res = await request(app)
      .get("/api/v1/publications/me?date_from=2024-12-31&date_to=2024-01-01")
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(400);
  });
});

describe("CORS", () => {
  it("permite un origin incluido en la whitelist", async () => {
    envConfig.allowedOrigins.push("http://allowed.test");
    const res = await request(app).get("/").set("Origin", "http://allowed.test");
    expect(res.status).toBe(200);
    envConfig.allowedOrigins.pop();
  });

  it("bloquea con 403 un origin no permitido", async () => {
    const res = await request(app).get("/").set("Origin", "http://blocked.test");
    expect(res.status).toBe(403);
  });
});
