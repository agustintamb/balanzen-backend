import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register, login, refresh, logout } from "#services/auth.service.js";
import { User } from "#models/user.model.js";

const CONSUMIDOR_BASE = {
  role: "CONSUMIDOR",
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@mail.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1155667788",
  dni: "35123456",
};

const COMERCIO_BASE = {
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

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("register", () => {
  it("registra un CONSUMIDOR y retorna tokens", async () => {
    const result = await register(CONSUMIDOR_BASE);
    expect(result.id).toBeDefined();
    expect(result.email).toBe("juan@mail.com");
    expect(result.role).toBe("CONSUMIDOR");
    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).toBeDefined();
    expect(result.business_name).toBeUndefined();
  });

  it("registra un COMERCIO y retorna business_name", async () => {
    const result = await register(COMERCIO_BASE);
    expect(result.role).toBe("COMERCIO");
    expect(result.business_name).toBe("Verdulería Don Mario");
    expect(result.access_token).toBeDefined();
  });

  it("lanza 400 si las contraseñas no coinciden", async () => {
    await expect(register({ ...CONSUMIDOR_BASE, confirm_password: "otra" })).rejects.toMatchObject({
      status: 400,
      message: "Las contraseñas no coinciden",
    });
  });

  it("lanza 400 si el rol es inválido", async () => {
    await expect(register({ ...CONSUMIDOR_BASE, role: "ADMIN" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("lanza 400 si COMERCIO no envía address", async () => {
    const sinAddress = { ...COMERCIO_BASE, address: undefined };
    await expect(register(sinAddress)).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 409 si el email ya está registrado", async () => {
    await register(CONSUMIDOR_BASE);
    await expect(register(CONSUMIDOR_BASE)).rejects.toMatchObject({ status: 409 });
  });

  it("guarda el refresh_token en el documento del usuario", async () => {
    const result = await register(CONSUMIDOR_BASE);
    const user = await User.findById(result.id);
    expect(user.refresh_token).toBe(result.refresh_token);
  });
});

describe("login", () => {
  it("retorna tokens y perfil con has_address: false para consumidor sin dirección", async () => {
    await register(CONSUMIDOR_BASE);
    const result = await login("juan@mail.com", "miPass123");
    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).toBeDefined();
    expect(result.user.has_address).toBe(false);
    expect(result.user.role).toBe("CONSUMIDOR");
  });

  it("retorna has_address: true para comercio (tiene dirección del registro)", async () => {
    await register(COMERCIO_BASE);
    const result = await login("maria@comercio.com", "miPass123");
    expect(result.user.has_address).toBe(true);
  });

  it("lanza 401 si el email no existe", async () => {
    await expect(login("noexiste@mail.com", "miPass123")).rejects.toMatchObject({ status: 401 });
  });

  it("lanza 401 si la contraseña es incorrecta", async () => {
    await register(CONSUMIDOR_BASE);
    await expect(login("juan@mail.com", "wrong")).rejects.toMatchObject({ status: 401 });
  });
});

describe("refresh", () => {
  it("genera un nuevo access_token con un refresh_token válido", async () => {
    const reg = await register(CONSUMIDOR_BASE);
    const result = await refresh(reg.refresh_token);
    expect(result.access_token).toBeDefined();
  });

  it("lanza 401 si el refresh_token es inválido", async () => {
    await expect(refresh("token.invalido.xxx")).rejects.toMatchObject({ status: 401 });
  });

  it("lanza 401 si el refresh_token no coincide con el almacenado", async () => {
    const reg = await register(CONSUMIDOR_BASE);
    // Segundo login genera un nuevo refresh_token, el primero queda inválido
    await login("juan@mail.com", "miPass123");
    await expect(refresh(reg.refresh_token)).rejects.toMatchObject({ status: 401 });
  });
});

describe("logout", () => {
  it("limpia el refresh_token del usuario", async () => {
    const reg = await register(CONSUMIDOR_BASE);
    await logout(reg.id);
    const user = await User.findById(reg.id);
    expect(user.refresh_token).toBeNull();
  });

  it("después del logout, el refresh_token anterior queda inválido", async () => {
    const reg = await register(CONSUMIDOR_BASE);
    await logout(reg.id);
    await expect(refresh(reg.refresh_token)).rejects.toMatchObject({ status: 401 });
  });
});
