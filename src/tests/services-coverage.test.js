import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register, changePassword } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import {
  createPublication,
  listPublications,
  getMyPublications,
  updatePublication,
  deletePublication,
  listAllPublications,
} from "#services/publications.service.js";
import { createOrder, cancelOrder, deliverOrder } from "#services/orders.service.js";
import { createAddress, selectAddress, deleteAddress } from "#services/addresses.service.js";
import { Publication } from "#models/publication.model.js";
import {
  CONSUMIDOR_DATA,
  COMERCIO_DATA_NO_ADDR,
  ADDRESS_DATA,
} from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const pubData = (categoryId, over = {}) => ({
  title: "Producto",
  description: "Descripción",
  original_price: 2000,
  final_price: 1000,
  expiry_date: new Date(Date.now() + 86400000),
  category_id: categoryId,
  ...over,
});

// Comercio con dirección seleccionada (necesario para calcular distancia)
const setupCommerceWithAddress = async () => {
  const commerce = await register({ ...COMERCIO_DATA_NO_ADDR });
  const addr = await createAddress(commerce.id, "COMERCIO", ADDRESS_DATA);
  await selectAddress(commerce.id, addr.id);
  const cat = await createCategory({ name: "Varios" });
  return { commerceId: commerce.id, catId: cat.id };
};

describe("listPublications - distancia, radio y ordenamientos", () => {
  it("calcula distancia, filtra por radio y ordena por cada criterio", async () => {
    const { commerceId, catId } = await setupCommerceWithAddress();
    await createPublication(
      commerceId,
      pubData(catId, { final_price: 1000, original_price: 2000 })
    );
    await createPublication(commerceId, pubData(catId, { final_price: 500, original_price: 3000 }));

    const geo = { lat: ADDRESS_DATA.lat + 0.01, lng: ADDRESS_DATA.lng + 0.01 };

    const byDistance = await listPublications({ ...geo, sort_by: "distance", radius_km: 50 });
    expect(byDistance.publications).toHaveLength(2);
    expect(byDistance.publications[0].distance_km).toBeDefined();

    for (const sort_by of ["created_at", "final_price", "expiry_date", "discount_pct"]) {
      const r = await listPublications({ sort_by, sort_order: "asc" });
      expect(r.publications).toHaveLength(2);
    }
  });

  it("el filtro de radio excluye publicaciones lejanas", async () => {
    const { commerceId, catId } = await setupCommerceWithAddress();
    await createPublication(commerceId, pubData(catId));
    const lejos = await listPublications({ lat: 10, lng: 10, radius_km: 1 });
    expect(lejos.publications).toHaveLength(0);
  });
});

describe("getMyPublications - publicación RESERVED con no leídos", () => {
  it("incluye unread_count para publicaciones reservadas", async () => {
    const { commerceId, catId } = await setupCommerceWithAddress();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    await createOrder(consumer.id, pub.id);

    const result = await getMyPublications(commerceId, {});
    const reserved = result.publications.find((p) => p.status === "RESERVED");
    expect(reserved).toBeDefined();
    expect(reserved.unread_count).toBe(0);
  });
});

describe("updatePublication / deletePublication - ramas de error", () => {
  it("update lanza 409 si la publicación no está ACTIVE", async () => {
    const { commerceId, catId } = await setupCommerceWithAddress();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    await createOrder(consumer.id, pub.id); // pasa a RESERVED
    await expect(updatePublication(pub.id, commerceId, { title: "x" })).rejects.toMatchObject({
      status: 409,
    });
  });

  it("update lanza 404 si la categoría nueva no existe", async () => {
    const { commerceId, catId } = await setupCommerceWithAddress();
    const pub = await createPublication(commerceId, pubData(catId));
    await expect(
      updatePublication(pub.id, commerceId, { category_id: "inexistente" })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("delete lanza 409 si la publicación no está ACTIVE", async () => {
    const { commerceId, catId } = await setupCommerceWithAddress();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    await createOrder(consumer.id, pub.id);
    await expect(deletePublication(pub.id, commerceId)).rejects.toMatchObject({ status: 409 });
  });
});

describe("listAllPublications", () => {
  it("mapea las publicaciones existentes", async () => {
    const { commerceId, catId } = await setupCommerceWithAddress();
    await createPublication(commerceId, pubData(catId));
    const result = await listAllPublications({});
    expect(result.publications).toHaveLength(1);
  });
});

describe("orders.service - ramas de error", () => {
  it("createOrder lanza 409 si ya hay una reserva activa (estado inconsistente)", async () => {
    const { commerceId, catId } = await setupCommerceWithAddress();
    const c1 = await register(CONSUMIDOR_DATA);
    const c2 = await register({ ...CONSUMIDOR_DATA, email: "c2@mail.com", dni: "22222222" });
    const pub = await createPublication(commerceId, pubData(catId));
    await createOrder(c1.id, pub.id); // pub -> RESERVED, orden RESERVED
    // Forzamos un estado inconsistente: pub ACTIVE pero con una orden RESERVED viva
    await Publication.findByIdAndUpdate(pub.id, { status: "ACTIVE" });
    await expect(createOrder(c2.id, pub.id)).rejects.toMatchObject({ status: 409 });
  });

  it("cancelOrder lanza 404 si el pedido no existe", async () => {
    const consumer = await register(CONSUMIDOR_DATA);
    await expect(cancelOrder("inexistente", consumer.id)).rejects.toMatchObject({ status: 404 });
  });

  it("deliverOrder lanza 404 si el pedido no existe", async () => {
    const { commerceId } = await setupCommerceWithAddress();
    await expect(deliverOrder("inexistente", commerceId)).rejects.toMatchObject({ status: 404 });
  });
});

describe("auth.service - ramas de error", () => {
  it("register lanza 400 si COMERCIO no envía business_name/cuit", async () => {
    const sinDatos = { ...COMERCIO_DATA_NO_ADDR };
    delete sinDatos.business_name;
    delete sinDatos.cuit;
    await expect(register(sinDatos)).rejects.toMatchObject({ status: 400 });
  });

  it("changePassword lanza 404 si el usuario no existe", async () => {
    await expect(
      changePassword("inexistente", {
        current_password: "x",
        new_password: "nuevaPass123",
        confirm_password: "nuevaPass123",
      })
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("addresses.service - ramas de error", () => {
  it("deleteAddress lanza 404 si la dirección no existe", async () => {
    const consumer = await register(CONSUMIDOR_DATA);
    await expect(deleteAddress(consumer.id, "inexistente")).rejects.toMatchObject({ status: 404 });
  });
});

describe("Publication.discount_pct (virtual)", () => {
  it("retorna 0 cuando original_price es 0 y no es donación", () => {
    const pub = new Publication({
      commerce_id: "c1",
      title: "x",
      description: "y",
      original_price: 0,
      final_price: 5,
      expiry_date: new Date(),
      category_id: "cat",
      is_donation: false,
    });
    expect(pub.discount_pct).toBe(0);
  });

  it("retorna 100 cuando es donación", () => {
    const pub = new Publication({
      commerce_id: "c1",
      title: "x",
      description: "y",
      original_price: 100,
      final_price: 100,
      expiry_date: new Date(),
      category_id: "cat",
      is_donation: true,
    });
    expect(pub.discount_pct).toBe(100);
  });

  it("retorna 0 en una donación gratuita (original_price 0), sin dividir por cero", () => {
    const pub = new Publication({
      commerce_id: "c1",
      title: "x",
      description: "y",
      original_price: 0,
      final_price: 0,
      expiry_date: new Date(),
      category_id: "cat",
      is_donation: true,
    });
    expect(pub.discount_pct).toBe(0);
  });
});
