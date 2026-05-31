import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { createOrder } from "#services/orders.service.js";
import { getAdminUserProfile } from "#services/users.service.js";
import { createAddress } from "#services/addresses.service.js";
import { runExpiredJob, runExpiringJob } from "#jobs/publication-expiry.job.js";
import { Publication } from "#models/publication.model.js";
import { listNotifications } from "#services/notification.service.js";
import {
  CONSUMIDOR_DATA,
  COMERCIO_DATA_NO_ADDR as COMERCIO_DATA,
  ADDRESS_DATA,
} from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("getAdminUserProfile", () => {
  it("retorna perfil completo de consumidor con sus direcciones", async () => {
    const { id } = await register(CONSUMIDOR_DATA);
    const profile = await getAdminUserProfile(id);

    expect(profile.id).toBe(id);
    expect(profile.role).toBe("CONSUMIDOR");
    expect(Array.isArray(profile.addresses)).toBe(true);
    expect(profile.deleted_at).toBeNull();
  });

  it("retorna perfil de comercio con campos de negocio y su dirección", async () => {
    const { id } = await register(COMERCIO_DATA);
    await createAddress(id, "COMERCIO", ADDRESS_DATA);
    const profile = await getAdminUserProfile(id);

    expect(profile.role).toBe("COMERCIO");
    expect(profile.business_name).toBe("Verdulería Don Mario");
    expect(profile.addresses).toHaveLength(1);
    expect(profile.addresses[0].formatted_address).toBe("Av. Corrientes 1234, CABA");
  });

  it("lanza 404 si el usuario no existe", async () => {
    await expect(getAdminUserProfile("id-inexistente")).rejects.toMatchObject({ status: 404 });
  });
});

describe("runExpiredJob", () => {
  it("cambia a EXPIRED las publicaciones ACTIVE vencidas y notifica al comercio", async () => {
    const { id: commerceId } = await register(COMERCIO_DATA);
    const cat = await createCategory({ name: "Verduras" });

    // Publicación ya vencida
    await Publication.create({
      commerce_id: commerceId,
      title: "Pub vencida",
      description: "desc",
      original_price: 1000,
      final_price: 500,
      expiry_date: new Date(Date.now() - 3600000), // hace 1 hora
      category_id: cat.id,
      status: "ACTIVE",
    });

    const count = await runExpiredJob();
    expect(count).toBe(1);

    const pub = await Publication.findOne({ title: "Pub vencida" });
    expect(pub.status).toBe("EXPIRED");

    const notifs = await listNotifications(commerceId, {});
    expect(notifs.notifications[0].type).toBe("PUBLICATION_EXPIRED");
  });

  it("no toca publicaciones que no están ACTIVE", async () => {
    const { id: commerceId } = await register(COMERCIO_DATA);
    const { id: consumerId } = await register(CONSUMIDOR_DATA);
    const cat = await createCategory({ name: "Verduras" });
    const pub = await createPublication(commerceId, {
      title: "Pub reservada",
      description: "desc",
      original_price: 1000,
      final_price: 500,
      expiry_date: new Date(Date.now() + 86400000),
      category_id: cat.id,
    });
    await createOrder(consumerId, pub.id);

    const count = await runExpiredJob();
    expect(count).toBe(0);
  });
});

describe("runExpiringJob", () => {
  it("notifica al comercio cuando una pub vence en menos de 24hs", async () => {
    const { id: commerceId } = await register(COMERCIO_DATA);
    const cat = await createCategory({ name: "Verduras" });

    await Publication.create({
      commerce_id: commerceId,
      title: "Pub por vencer",
      description: "desc",
      original_price: 1000,
      final_price: 500,
      expiry_date: new Date(Date.now() + 12 * 3600000), // vence en 12hs
      category_id: cat.id,
      status: "ACTIVE",
    });

    const count = await runExpiringJob();
    expect(count).toBe(1);

    const notifs = await listNotifications(commerceId, {});
    expect(notifs.notifications[0].type).toBe("PUBLICATION_EXPIRING");
  });

  it("no duplica la notificación si el job se ejecuta dos veces", async () => {
    const { id: commerceId } = await register(COMERCIO_DATA);
    const cat = await createCategory({ name: "Verduras" });

    await Publication.create({
      commerce_id: commerceId,
      title: "Pub por vencer",
      description: "desc",
      original_price: 1000,
      final_price: 500,
      expiry_date: new Date(Date.now() + 12 * 3600000),
      category_id: cat.id,
      status: "ACTIVE",
    });

    await runExpiringJob();
    await runExpiringJob();

    const notifs = await listNotifications(commerceId, { read: "false" });
    expect(notifs.notifications.filter((n) => n.type === "PUBLICATION_EXPIRING")).toHaveLength(1);
  });

  it("no notifica publicaciones que vencen después de 24hs", async () => {
    const { id: commerceId } = await register(COMERCIO_DATA);
    const cat = await createCategory({ name: "Verduras" });

    await Publication.create({
      commerce_id: commerceId,
      title: "Pub lejana",
      description: "desc",
      original_price: 1000,
      final_price: 500,
      expiry_date: new Date(Date.now() + 48 * 3600000), // 48hs
      category_id: cat.id,
      status: "ACTIVE",
    });

    const count = await runExpiringJob();
    expect(count).toBe(0);
  });
});
