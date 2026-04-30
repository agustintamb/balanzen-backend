import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { listUsers } from "#services/admin.service.js";

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

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const setup = async () => {
  await Promise.all([register(COMERCIO_DATA), register(CONSUMIDOR_DATA)]);
};

describe("listUsers", () => {
  it("lista todos los usuarios sin filtros", async () => {
    await setup();
    const result = await listUsers({});

    expect(result.users).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it("filtra por role=COMERCIO", async () => {
    await setup();
    const result = await listUsers({ role: "COMERCIO" });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].role).toBe("COMERCIO");
    expect(result.users[0].business_name).toBe("Verdulería Don Mario");
    expect(result.users[0].has_address).toBe(true);
    expect(result.users[0].selected_address).toBeDefined();
  });

  it("filtra por role=CONSUMIDOR", async () => {
    await setup();
    const result = await listUsers({ role: "CONSUMIDOR" });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].role).toBe("CONSUMIDOR");
  });

  it("busca por nombre con search", async () => {
    await setup();
    const result = await listUsers({ search: "juan" });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].first_name).toBe("Juan");
  });

  it("busca por email con search", async () => {
    await setup();
    const result = await listUsers({ search: "comercio.com" });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].email).toBe("maria@comercio.com");
  });

  it("retorna lista vacía si no hay coincidencias", async () => {
    await setup();
    const result = await listUsers({ search: "inexistente" });

    expect(result.users).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });
});
