import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  selectAddress,
  searchAddresses,
} from "#services/addresses.service.js";

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

const ADDR_1 = {
  formatted_address: "Av. Santa Fe 2000, CABA",
  street: "Av. Santa Fe",
  number: "2000",
  city: "CABA",
  province: "Buenos Aires",
  lat: -34.5955,
  lng: -58.3977,
};

const ADDR_2 = {
  formatted_address: "Av. Rivadavia 5000, CABA",
  street: "Av. Rivadavia",
  number: "5000",
  city: "CABA",
  province: "Buenos Aires",
  lat: -34.617,
  lng: -58.432,
};

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("getMyAddresses", () => {
  it("retorna lista vacía si el usuario no tiene direcciones", async () => {
    const { id } = await register(CONSUMIDOR);
    const { addresses } = await getMyAddresses(id);
    expect(addresses).toHaveLength(0);
  });

  it("retorna direcciones con la seleccionada primero", async () => {
    const { id } = await register(CONSUMIDOR);
    const addr1 = await createAddress(id, "CONSUMIDOR", ADDR_1);
    await createAddress(id, "CONSUMIDOR", ADDR_2);
    await selectAddress(id, addr1.id);
    const { addresses } = await getMyAddresses(id);
    expect(addresses).toHaveLength(2);
    expect(addresses[0].is_selected).toBe(true);
  });
});

describe("createAddress", () => {
  it("la dirección creada queda NO seleccionada", async () => {
    const { id } = await register(CONSUMIDOR);
    const addr = await createAddress(id, "CONSUMIDOR", ADDR_1);
    expect(addr.is_selected).toBe(false);
  });

  it("la segunda dirección del consumidor queda NO seleccionada", async () => {
    const { id } = await register(CONSUMIDOR);
    await createAddress(id, "CONSUMIDOR", ADDR_1);
    const addr2 = await createAddress(id, "CONSUMIDOR", ADDR_2);
    expect(addr2.is_selected).toBe(false);
  });

  it("el COMERCIO puede crear más de una dirección", async () => {
    const { id } = await register(COMERCIO);
    const addr1 = await createAddress(id, "COMERCIO", ADDR_1);
    const addr2 = await createAddress(id, "COMERCIO", ADDR_2);
    expect(addr1.is_selected).toBe(false);
    expect(addr2.is_selected).toBe(false);
  });

  it("lanza 409 si ya existe una dirección con las mismas coordenadas", async () => {
    const { id } = await register(CONSUMIDOR);
    await createAddress(id, "CONSUMIDOR", ADDR_1);
    await expect(createAddress(id, "CONSUMIDOR", ADDR_1)).rejects.toMatchObject({ status: 409 });
  });
});

describe("updateAddress", () => {
  it("actualiza campos de una dirección propia", async () => {
    const { id } = await register(CONSUMIDOR);
    const created = await createAddress(id, "CONSUMIDOR", ADDR_1);
    const updated = await updateAddress(id, created.id, { city: "Rosario" });
    expect(updated.city).toBe("Rosario");
  });

  it("lanza 404 si la dirección no pertenece al usuario", async () => {
    const { id: id1 } = await register(CONSUMIDOR);
    const { id: id2 } = await register({ ...COMERCIO, email: "otro@mail.com" });
    const addr = await createAddress(id1, "CONSUMIDOR", ADDR_1);
    await expect(updateAddress(id2, addr.id, { city: "Rosario" })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("deleteAddress", () => {
  it("lanza 400 si es la única dirección", async () => {
    const { id } = await register(CONSUMIDOR);
    const solaAddr = await createAddress(id, "CONSUMIDOR", ADDR_1);
    await expect(deleteAddress(id, solaAddr.id)).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 si la dirección está seleccionada", async () => {
    const { id } = await register(CONSUMIDOR);
    const addr1 = await createAddress(id, "CONSUMIDOR", ADDR_1);
    await createAddress(id, "CONSUMIDOR", ADDR_2);
    await selectAddress(id, addr1.id);
    await expect(deleteAddress(id, addr1.id)).rejects.toMatchObject({ status: 400 });
  });

  it("elimina correctamente una dirección no seleccionada con más de una", async () => {
    const { id } = await register(CONSUMIDOR);
    const addr1 = await createAddress(id, "CONSUMIDOR", ADDR_1);
    const addr2 = await createAddress(id, "CONSUMIDOR", ADDR_2);
    await selectAddress(id, addr1.id);
    await deleteAddress(id, addr2.id);
    const { addresses } = await getMyAddresses(id);
    expect(addresses).toHaveLength(1);
    expect(addresses[0].id).toBe(addr1.id);
  });
});

describe("selectAddress", () => {
  it("cambia la dirección seleccionada y desmarca la anterior", async () => {
    const { id } = await register(CONSUMIDOR);
    const addr1 = await createAddress(id, "CONSUMIDOR", ADDR_1);
    const addr2 = await createAddress(id, "CONSUMIDOR", ADDR_2);

    await selectAddress(id, addr1.id);
    await selectAddress(id, addr2.id);
    const { addresses } = await getMyAddresses(id);
    const selected = addresses.find((a) => a.is_selected);
    expect(selected.id).toBe(addr2.id);
  });

  it("lanza 404 si la dirección no pertenece al usuario", async () => {
    const { id: id1 } = await register(CONSUMIDOR);
    const { id: id2 } = await register({ ...COMERCIO, email: "otro@mail.com" });
    const addr = await createAddress(id1, "CONSUMIDOR", ADDR_1);
    await expect(selectAddress(id2, addr.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("searchAddresses", () => {
  it("retorna resultados parseados del geocoding", async () => {
    const mockResults = [
      {
        display_name: "Av. Corrientes 1234, CABA, Argentina",
        lat: "-34.6037",
        lon: "-58.3816",
        address: {
          road: "Av. Corrientes",
          house_number: "1234",
          city_district: "CABA",
          state: "Buenos Aires",
        },
      },
    ];

    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => mockResults,
    }));

    const { results } = await searchAddresses("Corrientes 1234");
    expect(results).toHaveLength(1);
    expect(results[0].street).toBe("Av. Corrientes");
    expect(results[0].lat).toBe(-34.6037);
    expect(results[0].lng).toBe(-58.3816);

    vi.unstubAllGlobals();
  });

  it("lanza 502 si el servicio de geocoding falla", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 500 }));
    await expect(searchAddresses("query")).rejects.toMatchObject({ status: 502 });
    vi.unstubAllGlobals();
  });
});
