import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { getMyProfile, updateMyProfile } from "#services/users.service.js";
import { createAddress, selectAddress } from "#services/addresses.service.js";

const CONSUMIDOR = {
  role: "CONSUMIDOR",
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@mail.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1155667788",
  dni: "35123456",
};

const COMERCIO = {
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
};

const ADDRESS_DATA = {
  formatted_address: "Av. Corrientes 1234, CABA",
  street: "Av. Corrientes",
  number: "1234",
  city: "CABA",
  province: "Buenos Aires",
  lat: -34.6037,
  lng: -58.3816,
};

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("getMyProfile", () => {
  it("retorna perfil completo de consumidor sin dirección", async () => {
    const { id } = await register(CONSUMIDOR);
    const profile = await getMyProfile(id);

    expect(profile.id).toBe(id);
    expect(profile.role).toBe("CONSUMIDOR");
    expect(profile.email).toBe("juan@mail.com");
    expect(profile.has_address).toBe(false);
    expect(profile.selected_address).toBeNull();
    expect(profile.business_name).toBeUndefined();
  });

  it("retorna perfil de comercio con selected_address y campos de negocio", async () => {
    const { id } = await register(COMERCIO);
    const addr = await createAddress(id, "COMERCIO", ADDRESS_DATA);
    await selectAddress(id, addr.id);
    const profile = await getMyProfile(id);

    expect(profile.role).toBe("COMERCIO");
    expect(profile.business_name).toBe("Verdulería Don Mario");
    expect(profile.cuit).toBe("20309876543");
    expect(profile.has_address).toBe(true);
    expect(profile.selected_address).not.toBeNull();
    expect(profile.selected_address.city).toBe("CABA");
  });

  it("lanza 404 si el usuario no existe", async () => {
    await expect(getMyProfile("id-inexistente")).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateMyProfile", () => {
  it("actualiza campos permitidos para CONSUMIDOR", async () => {
    const { id } = await register(CONSUMIDOR);
    const profile = await updateMyProfile(id, "CONSUMIDOR", {
      first_name: "Juan Carlos",
      phone: "1199887766",
    });

    expect(profile.first_name).toBe("Juan Carlos");
    expect(profile.phone).toBe("1199887766");
  });

  it("actualiza campos de negocio para COMERCIO", async () => {
    const { id } = await register(COMERCIO);
    const profile = await updateMyProfile(id, "COMERCIO", {
      business_name: "Verdulería Don Mario Centro",
      description: "Frutas y verduras",
    });

    expect(profile.business_name).toBe("Verdulería Don Mario Centro");
    expect(profile.description).toBe("Frutas y verduras");
  });

  it("ignora campos no permitidos (ej. dni para CONSUMIDOR)", async () => {
    const { id } = await register(CONSUMIDOR);
    const profile = await updateMyProfile(id, "CONSUMIDOR", {
      first_name: "Carlos",
      dni: "99999999",
    });

    expect(profile.first_name).toBe("Carlos");
    expect(profile.dni).toBe("35123456");
  });

  it("lanza 400 si no hay campos válidos para actualizar", async () => {
    const { id } = await register(CONSUMIDOR);
    await expect(updateMyProfile(id, "CONSUMIDOR", { dni: "99999999" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("lanza 409 si el email nuevo ya está en uso por otro usuario", async () => {
    const { id } = await register(CONSUMIDOR);
    await register({ ...COMERCIO, email: "otro@mail.com" });
    await expect(
      updateMyProfile(id, "CONSUMIDOR", { email: "otro@mail.com" })
    ).rejects.toMatchObject({
      status: 409,
    });
  });
});
