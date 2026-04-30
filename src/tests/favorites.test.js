import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { addFavorite, removeFavorite, listFavorites } from "#services/favorites.service.js";

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

let commerceId;
let consumerId;
let pubId;

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const setup = async () => {
  const [commerce, consumer] = await Promise.all([
    register(COMERCIO_DATA),
    register(CONSUMIDOR_DATA),
  ]);
  commerceId = commerce.id;
  consumerId = consumer.id;
  const cat = await createCategory({ name: "Verduras" });
  const pub = await createPublication(commerceId, {
    title: "Mix de verduras",
    description: "Tomate y lechuga",
    original_price: 2000,
    final_price: 1000,
    expiry_date: new Date(Date.now() + 86400000),
    category_id: cat.id,
  });
  pubId = pub.id;
};

describe("addFavorite", () => {
  it("agrega una publicación a favoritos", async () => {
    await setup();
    const result = await addFavorite(consumerId, pubId);
    expect(result.message).toBe("Agregado a favoritos");
  });

  it("lanza 409 si la publicación ya está en favoritos", async () => {
    await setup();
    await addFavorite(consumerId, pubId);
    await expect(addFavorite(consumerId, pubId)).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 404 si la publicación no existe", async () => {
    await setup();
    await expect(addFavorite(consumerId, "pub-inexistente")).rejects.toMatchObject({ status: 404 });
  });
});

describe("removeFavorite", () => {
  it("elimina un favorito existente", async () => {
    await setup();
    await addFavorite(consumerId, pubId);
    const result = await removeFavorite(consumerId, pubId);
    expect(result.message).toBe("Eliminado de favoritos");
  });

  it("lanza 404 si el favorito no existe", async () => {
    await setup();
    await expect(removeFavorite(consumerId, pubId)).rejects.toMatchObject({ status: 404 });
  });
});

describe("listFavorites", () => {
  it("retorna favoritos con datos de publicación populados", async () => {
    await setup();
    await addFavorite(consumerId, pubId);
    const result = await listFavorites(consumerId, {});

    expect(result.favorites).toHaveLength(1);
    expect(result.favorites[0].publication.title).toBe("Mix de verduras");
    expect(result.favorites[0].publication.commerce.business_name).toBe("Verdulería Don Mario");
    expect(result.pagination.total).toBe(1);
  });

  it("retorna lista vacía si el usuario no tiene favoritos", async () => {
    await setup();
    const result = await listFavorites(consumerId, {});
    expect(result.favorites).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });
});
