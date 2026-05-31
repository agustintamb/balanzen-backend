import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { getPublicProfile } from "#services/users.service.js";
import { createAddress, selectAddress } from "#services/addresses.service.js";
import {
  CONSUMIDOR_DATA,
  COMERCIO_DATA_NO_ADDR as COMERCIO_DATA,
  ADDRESS_DATA,
} from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("getPublicProfile", () => {
  it("retorna datos públicos de un COMERCIO con business_name y selected_address", async () => {
    const commerce = await register(COMERCIO_DATA);
    const addr = await createAddress(commerce.id, "COMERCIO", ADDRESS_DATA);
    await selectAddress(commerce.id, addr.id);
    const profile = await getPublicProfile(commerce.id);

    expect(profile.id).toBe(commerce.id);
    expect(profile.first_name).toBe("María");
    expect(profile.business_name).toBe("Verdulería Don Mario");
    expect(profile.selected_address).toBeDefined();
    expect(profile.selected_address.formatted_address).toBe("Av. Corrientes 1234, CABA");
    expect(profile.email).toBeUndefined();
    expect(profile.dni).toBeUndefined();
  });

  it("retorna datos públicos de un CONSUMIDOR sin business_name ni dirección", async () => {
    const consumer = await register(CONSUMIDOR_DATA);
    const profile = await getPublicProfile(consumer.id);

    expect(profile.id).toBe(consumer.id);
    expect(profile.first_name).toBe("Juan");
    expect(profile.business_name).toBeUndefined();
    expect(profile.selected_address).toBeUndefined();
    expect(profile.email).toBeUndefined();
  });

  it("lanza 404 si el usuario no existe", async () => {
    await expect(getPublicProfile("id-inexistente")).rejects.toMatchObject({ status: 404 });
  });
});
