import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

let mongoServer;
let TestModel;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const schema = new mongoose.Schema({
    _id: { type: String, default: generateId },
    name: { type: String },
  });
  schema.plugin(softDeletePlugin);
  TestModel = mongoose.model("SoftDeleteTest", schema);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Usamos la colección directa para limpiar todo, incluyendo borrados lógicamente
  await TestModel.collection.deleteMany({});
});

describe("softDeletePlugin", () => {
  it("inicializa deleted_at en null por defecto", async () => {
    const doc = await TestModel.create({ name: "activo" });
    expect(doc.deleted_at).toBeNull();
  });

  it("asigna un UUID v4 string como _id", async () => {
    const doc = await TestModel.create({ name: "con uuid" });
    expect(typeof doc._id).toBe("string");
    expect(doc._id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("find() solo retorna documentos con deleted_at: null", async () => {
    await TestModel.create({ name: "activo" });
    const borrado = await TestModel.create({ name: "borrado" });
    await borrado.softDelete();

    const results = await TestModel.find();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("activo");
  });

  it("findOne() no retorna documentos borrados", async () => {
    const doc = await TestModel.create({ name: "borrado" });
    await doc.softDelete();

    const found = await TestModel.findOne({ name: "borrado" });
    expect(found).toBeNull();
  });

  it("countDocuments() excluye documentos borrados", async () => {
    await TestModel.create({ name: "activo" });
    const borrado = await TestModel.create({ name: "borrado" });
    await borrado.softDelete();

    const count = await TestModel.countDocuments();
    expect(count).toBe(1);
  });

  it("findOneAndUpdate() no actualiza documentos borrados", async () => {
    const doc = await TestModel.create({ name: "original" });
    await doc.softDelete();

    await TestModel.findOneAndUpdate({ name: "original" }, { name: "modificado" });

    const noModificado = await TestModel.findWithDeleted({ name: "original" });
    expect(noModificado).toHaveLength(1);

    const noExiste = await TestModel.findWithDeleted({ name: "modificado" });
    expect(noExiste).toHaveLength(0);
  });

  it("softDelete() setea deleted_at a una Date dentro del rango esperado", async () => {
    const doc = await TestModel.create({ name: "a borrar" });
    const antes = new Date();
    await doc.softDelete();
    const despues = new Date();

    expect(doc.deleted_at).toBeInstanceOf(Date);
    expect(doc.deleted_at.getTime()).toBeGreaterThanOrEqual(antes.getTime());
    expect(doc.deleted_at.getTime()).toBeLessThanOrEqual(despues.getTime());
  });

  it("findWithDeleted() retorna todos los documentos, incluyendo borrados", async () => {
    await TestModel.create({ name: "activo" });
    const borrado = await TestModel.create({ name: "borrado" });
    await borrado.softDelete();

    const results = await TestModel.findWithDeleted();
    expect(results).toHaveLength(2);
  });

  it("findWithDeleted() acepta filtros y los aplica sobre todos los documentos", async () => {
    await TestModel.create({ name: "activo" });
    const borrado = await TestModel.create({ name: "borrado" });
    await borrado.softDelete();

    const results = await TestModel.findWithDeleted({ name: "borrado" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("borrado");
  });
});
