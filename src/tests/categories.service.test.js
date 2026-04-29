import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "#services/categories.service.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("listCategories", () => {
  it("retorna lista vacía cuando no hay categorías", async () => {
    const result = await listCategories();
    expect(result).toEqual([]);
  });

  it("retorna categorías activas ordenadas alfabéticamente", async () => {
    await createCategory({ name: "Verduras" });
    await createCategory({ name: "Frutas" });
    const result = await listCategories();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Frutas");
    expect(result[1].name).toBe("Verduras");
  });

  it("no retorna categorías eliminadas", async () => {
    const cat = await createCategory({ name: "Carnes" });
    await deleteCategory(cat.id);
    const result = await listCategories();
    expect(result).toHaveLength(0);
  });
});

describe("createCategory", () => {
  it("crea una categoría correctamente", async () => {
    const result = await createCategory({ name: "Panificados" });
    expect(result.id).toBeDefined();
    expect(result.name).toBe("Panificados");
    expect(result.icon_url).toBeNull();
  });

  it("crea una categoría con icon_url", async () => {
    const result = await createCategory({
      name: "Bebidas",
      icon_url: "https://cdn.example.com/bebidas.png",
    });
    expect(result.icon_url).toBe("https://cdn.example.com/bebidas.png");
  });

  it("lanza 409 si ya existe una categoría con el mismo nombre (case-insensitive)", async () => {
    await createCategory({ name: "Lácteos" });
    await expect(createCategory({ name: "lácteos" })).rejects.toMatchObject({ status: 409 });
  });
});

describe("updateCategory", () => {
  it("actualiza el nombre de una categoría", async () => {
    const cat = await createCategory({ name: "Otros" });
    const updated = await updateCategory(cat.id, { name: "Otros General" });
    expect(updated.name).toBe("Otros General");
  });

  it("lanza 404 si la categoría no existe", async () => {
    await expect(updateCategory("id-inexistente", { name: "Test" })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lanza 409 si el nuevo nombre ya lo usa otra categoría", async () => {
    const cat1 = await createCategory({ name: "Verduras" });
    await createCategory({ name: "Frutas" });
    await expect(updateCategory(cat1.id, { name: "frutas" })).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("deleteCategory", () => {
  it("elimina (soft delete) una categoría existente", async () => {
    const cat = await createCategory({ name: "Carnes" });
    await deleteCategory(cat.id);
    const result = await listCategories();
    expect(result).toHaveLength(0);
  });

  it("lanza 404 si la categoría no existe", async () => {
    await expect(deleteCategory("id-inexistente")).rejects.toMatchObject({ status: 404 });
  });
});
