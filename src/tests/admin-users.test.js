import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { listUsers } from "#services/admin.service.js";
import { createAddress, selectAddress } from "#services/addresses.service.js";
import {
  CONSUMIDOR_DATA,
  COMERCIO_DATA_NO_ADDR as COMERCIO_DATA,
  ADDRESS_DATA,
} from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const setup = async () => {
  const [comercio] = await Promise.all([register(COMERCIO_DATA), register(CONSUMIDOR_DATA)]);
  const addr = await createAddress(comercio.id, "COMERCIO", ADDRESS_DATA);
  await selectAddress(comercio.id, addr.id);
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
