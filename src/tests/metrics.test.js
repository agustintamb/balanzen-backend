import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { createOrder, deliverOrder, cancelOrder } from "#services/orders.service.js";
import { getCommerceSummary } from "#services/metrics.service.js";
import { setupTwoUsers } from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const createPub = async (commerceId, catId) =>
  createPublication(commerceId, {
    title: "Producto",
    description: "Descripción",
    original_price: 2000,
    final_price: 1000,
    expiry_date: new Date(Date.now() + 86400000),
    category_id: catId,
  });

describe("getCommerceSummary", () => {
  it("retorna todo en 0 si el comercio no tiene publicaciones ni pedidos", async () => {
    const { commerceId } = await setupTwoUsers();
    const result = await getCommerceSummary(commerceId);

    expect(result.total_publications).toBe(0);
    expect(result.active_publications).toBe(0);
    expect(result.total_reservations).toBe(0);
    expect(result.total_delivered).toBe(0);
    expect(result.total_cancelled).toBe(0);
    expect(result.conversion_rate).toBe(0);
  });

  it("calcula métricas correctamente con publicaciones y pedidos", async () => {
    const { commerceId, consumerId } = await setupTwoUsers();
    const cat = await createCategory({ name: "Verduras" });

    await createPub(commerceId, cat.id);
    const [pub1, pub2] = await Promise.all([
      createPub(commerceId, cat.id),
      createPub(commerceId, cat.id),
    ]);

    const [order1, order2] = await Promise.all([
      createOrder(consumerId, pub1.id),
      createOrder(consumerId, pub2.id),
    ]);

    await deliverOrder(order1.id, commerceId);
    await cancelOrder(order2.id, consumerId);

    const result = await getCommerceSummary(commerceId);

    expect(result.total_publications).toBe(3);
    expect(result.active_publications).toBe(2);
    expect(result.total_reservations).toBe(2);
    expect(result.total_delivered).toBe(1);
    expect(result.total_cancelled).toBe(1);
    expect(result.conversion_rate).toBe(50);
  });
});
