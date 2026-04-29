import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import {
  createPublication,
  listPublications,
  getPublicationById,
  updatePublication,
  deletePublication,
  getMyPublications,
} from "#services/publications.service.js";

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

const PUB_DATA = (categoryId) => ({
  title: "Mix de verduras del día",
  description: "Tomate, lechuga y zanahoria. Vence hoy.",
  original_price: 3000,
  final_price: 1500,
  expiry_date: new Date(Date.now() + 86400000),
  category_id: categoryId,
  photos: ["https://res.cloudinary.com/x/image/upload/v1/foto.jpg"],
});

let commerceId;
let categoryId;

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const setup = async () => {
  const { id } = await register(COMERCIO_DATA);
  commerceId = id;
  const cat = await createCategory({ name: "Verduras" });
  categoryId = cat.id;
};

describe("createPublication", () => {
  it("crea una publicación correctamente y calcula discount_pct e is_donation", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));

    expect(pub.id).toBeDefined();
    expect(pub.title).toBe("Mix de verduras del día");
    expect(pub.discount_pct).toBe(50);
    expect(pub.is_donation).toBe(false);
    expect(pub.status).toBe("ACTIVE");
    expect(pub.category.name).toBe("Verduras");
    expect(pub.commerce.business_name).toBe("Verdulería Don Mario");
  });

  it("marca is_donation cuando original_price === final_price", async () => {
    await setup();
    const pub = await createPublication(commerceId, {
      ...PUB_DATA(categoryId),
      original_price: 1000,
      final_price: 1000,
    });
    expect(pub.is_donation).toBe(true);
  });

  it("lanza 404 si la categoría no existe", async () => {
    await setup();
    await expect(
      createPublication(commerceId, { ...PUB_DATA(categoryId), category_id: "id-inexistente" })
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("listPublications", () => {
  it("lista solo publicaciones ACTIVE", async () => {
    await setup();
    await createPublication(commerceId, PUB_DATA(categoryId));
    const result = await listPublications({});
    expect(result.publications).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it("filtra por category_id", async () => {
    await setup();
    await createPublication(commerceId, PUB_DATA(categoryId));
    const cat2 = await createCategory({ name: "Frutas" });
    await createPublication(commerceId, { ...PUB_DATA(cat2.id), title: "Frutas" });

    const result = await listPublications({ category_id: categoryId });
    expect(result.publications).toHaveLength(1);
    expect(result.publications[0].title).toBe("Mix de verduras del día");
  });

  it("filtra por donation", async () => {
    await setup();
    await createPublication(commerceId, PUB_DATA(categoryId));
    await createPublication(commerceId, {
      ...PUB_DATA(categoryId),
      title: "Donación",
      original_price: 500,
      final_price: 500,
    });

    const result = await listPublications({ donation: "true" });
    expect(result.publications).toHaveLength(1);
    expect(result.publications[0].title).toBe("Donación");
  });

  it("filtra por search en título", async () => {
    await setup();
    await createPublication(commerceId, PUB_DATA(categoryId));
    await createPublication(commerceId, { ...PUB_DATA(categoryId), title: "Pan del día" });

    const result = await listPublications({ search: "verduras" });
    expect(result.publications).toHaveLength(1);
  });

  it("filtra por min_discount", async () => {
    await setup();
    await createPublication(commerceId, PUB_DATA(categoryId)); // 50% descuento
    await createPublication(commerceId, {
      ...PUB_DATA(categoryId),
      title: "Poco descuento",
      original_price: 1000,
      final_price: 900,
    }); // 10%

    const result = await listPublications({ min_discount: 40 });
    expect(result.publications).toHaveLength(1);
    expect(result.publications[0].discount_pct).toBeGreaterThanOrEqual(40);
  });
});

describe("getPublicationById", () => {
  it("retorna el detalle de una publicación", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));
    const result = await getPublicationById(pub.id);
    expect(result.id).toBe(pub.id);
    expect(result.commerce.business_name).toBe("Verdulería Don Mario");
  });

  it("lanza 404 si no existe", async () => {
    await expect(getPublicationById("id-inexistente")).rejects.toMatchObject({ status: 404 });
  });
});

describe("updatePublication", () => {
  it("actualiza campos de una publicación ACTIVE", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));
    const updated = await updatePublication(pub.id, commerceId, { title: "Nuevo título" });
    expect(updated.title).toBe("Nuevo título");
  });

  it("recalcula is_donation al actualizar precios", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));
    const updated = await updatePublication(pub.id, commerceId, {
      original_price: 500,
      final_price: 500,
    });
    expect(updated.is_donation).toBe(true);
  });

  it("lanza 403 si no es el owner", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));
    await expect(
      updatePublication(pub.id, "otro-commerce-id", { title: "Hack" })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 si la publicación no existe", async () => {
    await setup();
    await expect(
      updatePublication("id-inexistente", commerceId, { title: "Test" })
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("deletePublication", () => {
  it("cambia status a CANCELLED y aplica soft delete", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));
    await deletePublication(pub.id, commerceId);

    const result = await listPublications({});
    expect(result.publications).toHaveLength(0);
  });

  it("lanza 403 si no es el owner", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));
    await expect(deletePublication(pub.id, "otro-id")).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 si no existe", async () => {
    await expect(deletePublication("id-inexistente", commerceId)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("getMyPublications", () => {
  it("retorna publicaciones del comercio en todos los estados", async () => {
    await setup();
    await createPublication(commerceId, PUB_DATA(categoryId));
    await createPublication(commerceId, { ...PUB_DATA(categoryId), title: "Segunda" });

    const result = await getMyPublications(commerceId, {});
    expect(result.publications).toHaveLength(2);
  });

  it("retorna publicaciones canceladas (soft-deleted) junto a las activas", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));
    await deletePublication(pub.id, commerceId);
    await createPublication(commerceId, { ...PUB_DATA(categoryId), title: "Activa" });

    const result = await getMyPublications(commerceId, {});
    expect(result.publications).toHaveLength(2);
    const statuses = result.publications.map((p) => p.status);
    expect(statuses).toContain("CANCELLED");
    expect(statuses).toContain("ACTIVE");
  });

  it("filtra por status", async () => {
    await setup();
    const pub = await createPublication(commerceId, PUB_DATA(categoryId));
    await deletePublication(pub.id, commerceId);
    await createPublication(commerceId, { ...PUB_DATA(categoryId), title: "Activa" });

    const result = await getMyPublications(commerceId, { status: "ACTIVE" });
    expect(result.publications).toHaveLength(1);
    expect(result.publications[0].title).toBe("Activa");
  });
});
