import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import {
  createPublication,
  updatePublication,
  listPublications,
} from "#services/publications.service.js";
import { createOrder, cancelOrder, deliverOrder, listAllOrders } from "#services/orders.service.js";
import { addFavorite, listFavorites } from "#services/favorites.service.js";
import { sendMessage } from "#services/chat.service.js";
import * as notificationService from "#services/notification.service.js";
import { createAddress, selectAddress, searchAddresses } from "#services/addresses.service.js";
import {
  CONSUMIDOR_DATA,
  COMERCIO_DATA_NO_ADDR,
  ADDRESS_DATA,
} from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await clearDB();
});

const pubData = (categoryId, over = {}) => ({
  title: "Producto",
  description: "Desc",
  original_price: 2000,
  final_price: 1000,
  expiry_date: new Date(Date.now() + 86400000),
  category_id: categoryId,
  ...over,
});

const setupCommerce = async (withAddress = true) => {
  const commerce = await register({ ...COMERCIO_DATA_NO_ADDR });
  if (withAddress) {
    const addr = await createAddress(commerce.id, "COMERCIO", ADDRESS_DATA);
    await selectAddress(commerce.id, addr.id);
  }
  const cat = await createCategory({ name: "Cat" });
  return { commerceId: commerce.id, catId: cat.id };
};

describe("orders.service - cancelación por comercio y filtros admin", () => {
  it("el comercio cancela con publicación borrada (fallback de mensaje)", async () => {
    const { commerceId, catId } = await setupCommerce();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    const order = await createOrder(consumer.id, pub.id);
    await mongoose.connection.collection("publications").deleteMany({});
    await cancelOrder(order.id, commerceId); // isCancelledByConsumer=false + pub null
  });

  it("listAllOrders aplica filtros status/consumer_id/commerce_id", async () => {
    const { commerceId, catId } = await setupCommerce();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    await createOrder(consumer.id, pub.id);
    const res = await listAllOrders({
      status: "RESERVED",
      consumer_id: consumer.id,
      commerce_id: commerceId,
    });
    expect(res.orders).toHaveLength(1);
  });
});

describe("publications.service - categoría", () => {
  it("update con una categoría nueva válida", async () => {
    const { commerceId, catId } = await setupCommerce();
    const cat2 = await createCategory({ name: "Cat2" });
    const pub = await createPublication(commerceId, pubData(catId));
    const res = await updatePublication(pub.id, commerceId, { category_id: cat2.id });
    expect(res.category.id).toBe(cat2.id);
  });

  it("lista una publicación cuya categoría fue borrada (category null)", async () => {
    const { commerceId, catId } = await setupCommerce();
    await createPublication(commerceId, pubData(catId));
    await mongoose.connection.collection("categories").deleteMany({});
    const res = await listPublications({});
    expect(res.publications[0].category).toBeNull();
  });
});

describe("favorites.service - comercio con dirección seleccionada", () => {
  it("incluye selected_address cuando el comercio tiene dirección", async () => {
    const { commerceId, catId } = await setupCommerce(true);
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    await addFavorite(consumer.id, pub.id);
    const res = await listFavorites(consumer.id, {});
    expect(res.favorites[0].publication.commerce.selected_address).not.toBeNull();
  });
});

describe("side-effects best-effort - una notificación caída no rompe la operación", () => {
  it("create/cancel/deliver/sendMessage siguen funcionando si createNotification falla", async () => {
    vi.spyOn(notificationService, "createNotification").mockRejectedValue(new Error("notif down"));
    const { commerceId, catId } = await setupCommerce();
    const consumer = await register(CONSUMIDOR_DATA);

    const pub1 = await createPublication(commerceId, pubData(catId));
    const order1 = await createOrder(consumer.id, pub1.id); // catch en createOrder
    await sendMessage(order1.id, consumer.id, "hola"); // catch en sendMessage
    await cancelOrder(order1.id, consumer.id); // catch en cancelOrder

    const pub2 = await createPublication(commerceId, pubData(catId));
    const order2 = await createOrder(consumer.id, pub2.id);
    await deliverOrder(order2.id, commerceId); // catch en deliverOrder

    expect(order2.id).toBeDefined();
  });
});

describe("addresses.service - mapeo de geocoding con campos alternativos", () => {
  it("usa pedestrian/path y maneja campos ausentes", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => [
        {
          lat: "-34.6",
          lon: "-58.3",
          address: { pedestrian: "Peatonal", suburb: "Sub", state: "St" },
        },
        { lat: "-34.7", lon: "-58.4", address: { path: "Sendero", town: "Pueblo" } },
        { lat: "-34.8", lon: "-58.5", address: {} },
      ],
    }));
    const { results } = await searchAddresses("algo");
    expect(results).toHaveLength(3);
    expect(results[0].street).toBe("Peatonal");
    expect(results[1].street).toBe("Sendero");
    expect(results[2].street).toBe("");
    expect(results[2].number).toBe("");
  });
});
