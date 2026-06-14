import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "#app.js";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { authConsumer, bearer } from "#tests/helpers/auth.helper.js";
import { CONSUMIDOR_DATA } from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("POST /api/v1/auth/register", () => {
  it("registra un consumidor y devuelve 201 con tokens", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(CONSUMIDOR_DATA);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.role).toBe("CONSUMIDOR");
  });

  it("devuelve 400 si falta un campo requerido (validate middleware)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...CONSUMIDOR_DATA, email: "no-es-email" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("devuelve 409 si el email ya está registrado", async () => {
    await request(app).post("/api/v1/auth/register").send(CONSUMIDOR_DATA);
    const res = await request(app).post("/api/v1/auth/register").send(CONSUMIDOR_DATA);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/v1/auth/login", () => {
  it("loguea y devuelve 200 con tokens y has_address", async () => {
    await request(app).post("/api/v1/auth/register").send(CONSUMIDOR_DATA);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: CONSUMIDOR_DATA.email, password: CONSUMIDOR_DATA.password });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.has_address).toBe(false);
  });

  it("devuelve 401 con credenciales inválidas", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "noexiste@mail.com", password: "loquesea" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("renueva el access token con un refresh válido", async () => {
    const { token, refresh_token } = await authConsumer();
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Authorization", bearer(token))
      .send({ refresh_token });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
  });

  it("devuelve 400 si no se envía refresh_token", async () => {
    const { token } = await authConsumer();
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Authorization", bearer(token))
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("auth middleware", () => {
  it("devuelve 401 si no se envía token", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token no proporcionado");
  });

  it("devuelve 401 si el token es inválido", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("cierra sesión con token válido", async () => {
    const { token } = await authConsumer();
    const res = await request(app).post("/api/v1/auth/logout").set("Authorization", bearer(token));
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/v1/auth/password", () => {
  it("cambia la contraseña con la actual correcta", async () => {
    const { token } = await authConsumer();
    const res = await request(app)
      .put("/api/v1/auth/password")
      .set("Authorization", bearer(token))
      .send({
        current_password: CONSUMIDOR_DATA.password,
        new_password: "nuevaPass123",
        confirm_password: "nuevaPass123",
      });
    expect(res.status).toBe(200);
  });

  it("devuelve 401 si la contraseña actual es incorrecta", async () => {
    const { token } = await authConsumer();
    const res = await request(app)
      .put("/api/v1/auth/password")
      .set("Authorization", bearer(token))
      .send({
        current_password: "incorrecta",
        new_password: "nuevaPass123",
        confirm_password: "nuevaPass123",
      });
    expect(res.status).toBe(401);
  });
});
