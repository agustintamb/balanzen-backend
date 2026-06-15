import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { addFavorite, removeFavorite, listFavorites } from "#services/favorites.service.js";
import { setupWithPublication } from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("addFavorite", () => {
  it("agrega una publicación a favoritos", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    const result = await addFavorite(consumerId, pubId);
    expect(result.message).toBe("Agregado a favoritos");
  });

  it("lanza 409 si la publicación ya está en favoritos", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await addFavorite(consumerId, pubId);
    await expect(addFavorite(consumerId, pubId)).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 404 si la publicación no existe", async () => {
    const { consumerId } = await setupWithPublication();
    await expect(addFavorite(consumerId, "pub-inexistente")).rejects.toMatchObject({ status: 404 });
  });

  it("permite re-agregar tras quitar (toggle POST→DELETE→POST sin 409 por duplicado)", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await addFavorite(consumerId, pubId);
    await removeFavorite(consumerId, pubId);
    const result = await addFavorite(consumerId, pubId);
    expect(result.message).toBe("Agregado a favoritos");

    // Quedó un único favorito activo (se reactivó el doc, no se creó otro)
    const list = await listFavorites(consumerId, {});
    expect(list.favorites).toHaveLength(1);
    expect(list.pagination.total).toBe(1);
  });
});

describe("removeFavorite", () => {
  it("elimina un favorito existente", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await addFavorite(consumerId, pubId);
    const result = await removeFavorite(consumerId, pubId);
    expect(result.message).toBe("Eliminado de favoritos");
  });

  it("lanza 404 si el favorito no existe", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await expect(removeFavorite(consumerId, pubId)).rejects.toMatchObject({ status: 404 });
  });
});

describe("listFavorites", () => {
  it("retorna favoritos con datos de publicación populados", async () => {
    const { consumerId, pubId } = await setupWithPublication();
    await addFavorite(consumerId, pubId);
    const result = await listFavorites(consumerId, {});

    expect(result.favorites).toHaveLength(1);
    expect(result.favorites[0].publication.title).toBe("Mix de verduras");
    expect(result.favorites[0].publication.commerce.business_name).toBe("Verdulería Don Mario");
    expect(result.pagination.total).toBe(1);
  });

  it("retorna lista vacía si el usuario no tiene favoritos", async () => {
    const { consumerId } = await setupWithPublication();
    const result = await listFavorites(consumerId, {});
    expect(result.favorites).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });
});
