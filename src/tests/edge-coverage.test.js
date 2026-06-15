import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import app from "#app.js";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register, changePassword } from "#services/auth.service.js";
import { createCategory, updateCategory } from "#services/categories.service.js";
import {
  createPublication,
  listPublications,
  getMyPublications,
  listAllPublications,
} from "#services/publications.service.js";
import {
  createOrder,
  cancelOrder,
  deliverOrder,
  getOrderById,
  listOrders,
  listAllOrders,
} from "#services/orders.service.js";
import { updateMyProfile } from "#services/users.service.js";
import { addFavorite, listFavorites } from "#services/favorites.service.js";
import { listChats, sendMessage } from "#services/chat.service.js";
import { createAddress, selectAddress } from "#services/addresses.service.js";
import { User } from "#models/user.model.js";
import { authConsumer, bearer } from "#tests/helpers/auth.helper.js";
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
  description: "Desc",
  original_price: 2000,
  final_price: 1000,
  expiry_date: new Date(Date.now() + 86400000),
  category_id: categoryId,
  ...over,
});

const hardDeletePublications = () => mongoose.connection.collection("publications").deleteMany({});

const setupCommerce = async (withAddress = true, suffix = "0") => {
  const commerce = await register({
    ...COMERCIO_DATA_NO_ADDR,
    email: `comercio${suffix}@mail.com`,
    cuit: `2030987654${suffix}`,
    dni: `3098765${suffix}`,
  });
  if (withAddress) {
    const addr = await createAddress(commerce.id, "COMERCIO", ADDRESS_DATA);
    await selectAddress(commerce.id, addr.id);
  }
  const cat = await createCategory({ name: `Cat${suffix}` });
  return { commerceId: commerce.id, catId: cat.id };
};

describe("users.service updateMyProfile - email", () => {
  it("permite actualizar al propio email sin conflicto", async () => {
    const u = await register(CONSUMIDOR_DATA);
    const res = await updateMyProfile(u.id, "CONSUMIDOR", { email: CONSUMIDOR_DATA.email });
    expect(res.email).toBe(CONSUMIDOR_DATA.email);
  });

  it("lanza 409 si el email ya pertenece a otro usuario", async () => {
    await register(CONSUMIDOR_DATA);
    const u2 = await register({ ...CONSUMIDOR_DATA, email: "otro@mail.com", dni: "20202020" });
    await expect(
      updateMyProfile(u2.id, "CONSUMIDOR", { email: CONSUMIDOR_DATA.email })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("auth.service register COMERCIO con description", () => {
  it("persiste description cuando se envía", async () => {
    const res = await register({ ...COMERCIO_DATA_NO_ADDR, description: "Mi comercio" });
    expect(res.id).toBeDefined();
    const user = await User.findById(res.id);
    expect(user.description).toBe("Mi comercio");
  });
});

describe("changePassword - new !== confirm", () => {
  it("lanza 400 si las contraseñas no coinciden", async () => {
    const u = await register(CONSUMIDOR_DATA);
    await expect(
      changePassword(u.id, {
        current_password: CONSUMIDOR_DATA.password,
        new_password: "aaaaaa1",
        confirm_password: "bbbbbb2",
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("categories.service updateCategory - variantes", () => {
  it("actualiza icon_url y active", async () => {
    const cat = await createCategory({ name: "Original" });
    const res = await updateCategory(cat.id, { icon_url: "https://x/i.png", active: false });
    expect(res.icon_url).toBe("https://x/i.png");
    expect(res.active).toBe(false);
  });

  it("lanza 409 si el nuevo nombre ya existe en otra categoría", async () => {
    await createCategory({ name: "Existente" });
    const cat = await createCategory({ name: "Otra" });
    await expect(updateCategory(cat.id, { name: "Existente" })).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("favorites.service listFavorites - ramas", () => {
  it("omite favoritos cuya publicación fue borrada y maneja comercio sin dirección", async () => {
    const { commerceId, catId } = await setupCommerce(false); // sin dirección
    const consumer = await register(CONSUMIDOR_DATA);
    const pub1 = await createPublication(commerceId, pubData(catId));
    const pub2 = await createPublication(commerceId, pubData(catId));
    await addFavorite(consumer.id, pub1.id);
    await addFavorite(consumer.id, pub2.id);

    // Borra físicamente pub2 -> listFavorites debe omitirla (return null)
    await mongoose.connection.collection("publications").deleteOne({ _id: pub2.id });

    const res = await listFavorites(consumer.id, {});
    expect(res.favorites).toHaveLength(1);
    expect(res.favorites[0].publication.commerce.selected_address).toBeNull();
  });

  it("maneja comercio inexistente (borrado) en el favorito", async () => {
    const { commerceId, catId } = await setupCommerce(false);
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    await addFavorite(consumer.id, pub.id);

    await User.collection.deleteOne({ _id: commerceId }); // borra el comercio físicamente

    const res = await listFavorites(consumer.id, {});
    expect(res.favorites[0].publication.commerce).toBeNull();
  });
});

describe("orders.service - publicación borrada y vencida", () => {
  it("cancela una orden cuya publicación venció (no reactiva)", async () => {
    const { commerceId, catId } = await setupCommerce();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(
      commerceId,
      pubData(catId, { expiry_date: new Date(Date.now() - 86400000) })
    );
    const order = await createOrder(consumer.id, pub.id);
    await cancelOrder(order.id, consumer.id); // pub vencida -> rama "no reactivar"
    const detail = await getOrderById(order.id, consumer.id);
    expect(detail.status).toBe("CANCELLED");
  });

  it("cancela/consulta/lista con publicación borrada físicamente (fallbacks de título)", async () => {
    const { commerceId, catId } = await setupCommerce();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    const order = await createOrder(consumer.id, pub.id);

    await hardDeletePublications();

    const detail = await getOrderById(order.id, consumer.id);
    expect(detail.publication).toBeNull();

    const asConsumer = await listOrders(consumer.id, "CONSUMIDOR", {});
    expect(asConsumer.orders[0].publication).toBeNull();
    const all = await listAllOrders({});
    expect(all.orders[0].publication).toBeNull();

    await cancelOrder(order.id, consumer.id); // usa pub?.title ?? fallback
    const after = await getOrderById(order.id, consumer.id);
    expect(after.status).toBe("CANCELLED");
  });

  it("marca como entregado con publicación borrada (fallback de título)", async () => {
    const { commerceId, catId } = await setupCommerce();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    const order = await createOrder(consumer.id, pub.id);
    await hardDeletePublications();
    await deliverOrder(order.id, commerceId);
    const after = await getOrderById(order.id, consumer.id);
    expect(after.status).toBe("DELIVERED");
  });
});

describe("publications.service - filtros y ordenamientos extra", () => {
  it("filtra por max_price y por sort_by inválido", async () => {
    const { commerceId, catId } = await setupCommerce();
    await createPublication(commerceId, pubData(catId, { final_price: 500 }));
    await createPublication(commerceId, pubData(catId, { final_price: 5000 }));

    const barato = await listPublications({ max_price: 1000 });
    expect(barato.publications).toHaveLength(1);

    const sinOrden = await listPublications({ sort_by: "inexistente" });
    expect(sinOrden.publications.length).toBeGreaterThan(0);
  });

  it("ordena por distancia cuando algún comercio no tiene dirección (fallback Infinity)", async () => {
    const conAddr = await setupCommerce(true, "1");
    const sinAddr = await setupCommerce(false, "2");
    await createPublication(conAddr.commerceId, pubData(conAddr.catId));
    await createPublication(sinAddr.commerceId, pubData(sinAddr.catId));

    const res = await listPublications({
      lat: ADDRESS_DATA.lat,
      lng: ADDRESS_DATA.lng,
      sort_by: "distance",
    });
    expect(res.publications).toHaveLength(2);
  });

  it("listAllPublications con filtros status/commerce_id/category_id", async () => {
    const { commerceId, catId } = await setupCommerce();
    await createPublication(commerceId, pubData(catId));
    const res = await listAllPublications({
      status: "ACTIVE",
      commerce_id: commerceId,
      category_id: catId,
    });
    expect(res.publications).toHaveLength(1);
  });

  it("getMyPublications con publicación RESERVED sin orden activa (unread 0)", async () => {
    const { commerceId, catId } = await setupCommerce();
    const pub = await createPublication(commerceId, pubData(catId));
    // Estado inconsistente: RESERVED sin orden -> rama orderId falsy
    await mongoose.connection
      .collection("publications")
      .updateOne({ _id: pub.id }, { $set: { status: "RESERVED" } });
    const res = await getMyPublications(commerceId, {});
    const reserved = res.publications.find((p) => p.status === "RESERVED");
    expect(reserved.unread_count).toBe(0);
  });
});

describe("chat.service listChats - contraparte/publicación nulas y sin mensajes", () => {
  it("maneja chat sin mensajes y con contraparte/publicación borradas", async () => {
    const { commerceId, catId } = await setupCommerce();
    const consumer = await register(CONSUMIDOR_DATA);
    const pub = await createPublication(commerceId, pubData(catId));
    const order = await createOrder(consumer.id, pub.id);

    // chat sin mensajes -> last_message null
    const sinMsg = await listChats(consumer.id);
    expect(sinMsg.chats[0].last_message).toBeNull();

    // un mensaje -> last_message presente
    await sendMessage(order.id, consumer.id, "hola");
    // borra físicamente comercio y publicación -> counterpart y pub null
    await User.collection.deleteOne({ _id: commerceId });
    await hardDeletePublications();

    const res = await listChats(consumer.id);
    expect(res.chats[0].counterpart).toBeNull();
    expect(res.chats[0].publication_title).toBeNull();
    expect(res.chats[0].last_message).not.toBeNull();
  });
});

describe("soft-delete plugin - query con deleted_at explícito", () => {
  it("respeta un filtro deleted_at explícito en la query", async () => {
    await register(CONSUMIDOR_DATA);
    const activos = await User.find({ deleted_at: null });
    expect(activos.length).toBeGreaterThan(0);
  });
});

describe("addresses controller - update exitoso (HTTP)", () => {
  it("PUT /addresses/:id actualiza y responde 200", async () => {
    const consumer = await authConsumer();
    const created = await request(app)
      .post("/api/v1/addresses")
      .set("Authorization", bearer(consumer.token))
      .send({
        formatted_address: "Calle 1",
        street: "Calle",
        number: "1",
        city: "CABA",
        province: "BA",
        lat: -34.6,
        lng: -58.4,
      });
    const res = await request(app)
      .put(`/api/v1/addresses/${created.body.id}`)
      .set("Authorization", bearer(consumer.token))
      .send({ city: "Córdoba" });
    expect(res.status).toBe(200);
    expect(res.body.city).toBe("Córdoba");
  });
});
