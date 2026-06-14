import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import app from "#app.js";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { authConsumer, authCommerce, authAdmin, bearer } from "#tests/helpers/auth.helper.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { createOrder } from "#services/orders.service.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const ADDRESS_BODY = {
  formatted_address: "Av. Corrientes 1234, CABA",
  street: "Av. Corrientes",
  number: "1234",
  city: "CABA",
  province: "Buenos Aires",
  lat: -34.6037,
  lng: -58.3816,
};

describe("GET /api/v1/health", () => {
  it("responde 200 sin autenticación", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("rutas base y 404", () => {
  it("la raíz responde 200", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("una ruta inexistente responde 404", async () => {
    const res = await request(app).get("/api/v1/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/v1/categories", () => {
  it("lista categorías para un usuario autenticado", async () => {
    const consumer = await authConsumer();
    await createCategory({ name: "Lácteos" });
    const res = await request(app)
      .get("/api/v1/categories")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(1);
  });

  it("devuelve 401 sin token", async () => {
    const res = await request(app).get("/api/v1/categories");
    expect(res.status).toBe(401);
  });
});

describe("Users", () => {
  it("GET /users/me devuelve el perfil propio", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(200);
    expect(res.body.email).toBeDefined();
  });

  it("PUT /users/me actualiza el perfil", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .put("/api/v1/users/me")
      .set("Authorization", bearer(consumer.token))
      .send({ first_name: "NuevoNombre" });
    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe("NuevoNombre");
  });

  it("GET /users/:id/public devuelve datos públicos", async () => {
    const commerce = await authCommerce();
    const consumer = await authConsumer();
    const res = await request(app)
      .get(`/api/v1/users/${commerce.id}/public`)
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(200);
  });
});

describe("Addresses", () => {
  it("POST /addresses crea una dirección (201)", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .post("/api/v1/addresses")
      .set("Authorization", bearer(consumer.token))
      .send(ADDRESS_BODY);
    expect(res.status).toBe(201);
  });

  it("GET /addresses lista las direcciones", async () => {
    const consumer = await authConsumer();
    await request(app)
      .post("/api/v1/addresses")
      .set("Authorization", bearer(consumer.token))
      .send(ADDRESS_BODY);
    const res = await request(app)
      .get("/api/v1/addresses")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(200);
    expect(res.body.addresses).toHaveLength(1);
  });

  it("PUT /addresses/:id/select selecciona una dirección", async () => {
    const consumer = await authConsumer();
    const created = await request(app)
      .post("/api/v1/addresses")
      .set("Authorization", bearer(consumer.token))
      .send(ADDRESS_BODY);
    const res = await request(app)
      .put(`/api/v1/addresses/${created.body.id}/select`)
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(200);
  });

  it("GET /addresses/search devuelve 400 sin q", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .get("/api/v1/addresses/search")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(400);
  });

  it("GET /addresses/search devuelve resultados (geocoding mockeado)", async () => {
    const consumer = await authConsumer();
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => [
        {
          display_name: "Av. Corrientes 1234, CABA",
          lat: "-34.6037",
          lon: "-58.3816",
          address: { road: "Av. Corrientes", house_number: "1234" },
        },
      ],
    }));
    const res = await request(app)
      .get("/api/v1/addresses/search?q=Corrientes")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

describe("Notifications", () => {
  // Al crear una orden se genera una notificación NEW_RESERVATION para el comercio
  const setupNotification = async () => {
    const commerce = await authCommerce();
    const consumer = await authConsumer();
    const cat = await createCategory({ name: "Verduras" });
    const pub = await createPublication(commerce.id, {
      title: "Mix",
      description: "desc",
      original_price: 2000,
      final_price: 1000,
      expiry_date: new Date(Date.now() + 86400000),
      category_id: cat.id,
    });
    await createOrder(consumer.id, pub.id);
    return commerce;
  };

  it("GET /notifications lista con unread_count", async () => {
    const commerce = await setupNotification();
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(200);
    expect(res.body.unread_count).toBe(1);
  });

  it("PUT /notifications/:id/read marca una como leída y 404 si no existe", async () => {
    const commerce = await setupNotification();
    const list = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", bearer(commerce.token));
    const notifId = list.body.notifications[0].id;

    const ok = await request(app)
      .put(`/api/v1/notifications/${notifId}/read`)
      .set("Authorization", bearer(commerce.token));
    expect(ok.status).toBe(200);

    const notFound = await request(app)
      .put("/api/v1/notifications/inexistente/read")
      .set("Authorization", bearer(commerce.token));
    expect(notFound.status).toBe(404);
  });

  it("PUT /notifications/read-all marca todas como leídas", async () => {
    const commerce = await setupNotification();
    const res = await request(app)
      .put("/api/v1/notifications/read-all")
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(200);
  });
});

describe("Favorites", () => {
  const setupFavorite = async () => {
    const commerce = await authCommerce();
    const consumer = await authConsumer();
    const cat = await createCategory({ name: "Verduras" });
    const pub = await createPublication(commerce.id, {
      title: "Mix",
      description: "desc",
      original_price: 2000,
      final_price: 1000,
      expiry_date: new Date(Date.now() + 86400000),
      category_id: cat.id,
    });
    return { consumer, commerce, pubId: pub.id };
  };

  it("POST agrega, GET lista y DELETE quita un favorito", async () => {
    const { consumer, pubId } = await setupFavorite();

    const add = await request(app)
      .post(`/api/v1/favorites/${pubId}`)
      .set("Authorization", bearer(consumer.token));
    expect(add.status).toBe(201);

    const list = await request(app)
      .get("/api/v1/favorites")
      .set("Authorization", bearer(consumer.token));
    expect(list.status).toBe(200);

    const del = await request(app)
      .delete(`/api/v1/favorites/${pubId}`)
      .set("Authorization", bearer(consumer.token));
    expect(del.status).toBe(200);
  });

  it("devuelve 403 si un COMERCIO usa favoritos", async () => {
    const { commerce, pubId } = await setupFavorite();
    const res = await request(app)
      .post(`/api/v1/favorites/${pubId}`)
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(403);
  });
});

describe("Metrics", () => {
  it("GET /metrics/summary devuelve el resumen del comercio (200)", async () => {
    const commerce = await authCommerce();
    const res = await request(app)
      .get("/api/v1/metrics/summary")
      .set("Authorization", bearer(commerce.token));
    expect(res.status).toBe(200);
    expect(res.body.total_publications).toBe(0);
  });

  it("devuelve 403 para un CONSUMIDOR", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .get("/api/v1/metrics/summary")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(403);
  });
});

describe("Admin", () => {
  it("crea categoría, lista publicaciones, órdenes y usuarios (ADMIN)", async () => {
    const admin = await authAdmin();

    const cat = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", bearer(admin.token))
      .send({ name: "Bebidas" });
    expect(cat.status).toBe(201);

    const pubs = await request(app)
      .get("/api/v1/admin/publications")
      .set("Authorization", bearer(admin.token));
    expect(pubs.status).toBe(200);

    const orders = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", bearer(admin.token));
    expect(orders.status).toBe(200);

    const users = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", bearer(admin.token));
    expect(users.status).toBe(200);
  });

  it("PUT y DELETE de categoría y GET de un usuario", async () => {
    const admin = await authAdmin();
    const commerce = await authCommerce();

    const cat = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", bearer(admin.token))
      .send({ name: "Bebidas" });

    const upd = await request(app)
      .put(`/api/v1/admin/categories/${cat.body.id}`)
      .set("Authorization", bearer(admin.token))
      .send({ name: "Bebidas frías" });
    expect(upd.status).toBe(200);

    const del = await request(app)
      .delete(`/api/v1/admin/categories/${cat.body.id}`)
      .set("Authorization", bearer(admin.token));
    expect(del.status).toBe(200);

    const user = await request(app)
      .get(`/api/v1/admin/users/${commerce.id}`)
      .set("Authorization", bearer(admin.token));
    expect(user.status).toBe(200);
  });

  it("devuelve 403 si un no-admin accede al panel", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(403);
  });
});

describe("Uploads", () => {
  it("POST /uploads/image devuelve 400 sin archivo", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .post("/api/v1/uploads/image")
      .set("Authorization", bearer(consumer.token));
    expect(res.status).toBe(400);
  });

  it("DELETE /uploads/image devuelve 400 sin url", async () => {
    const consumer = await authConsumer();
    const res = await request(app)
      .delete("/api/v1/uploads/image")
      .set("Authorization", bearer(consumer.token))
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("Chat", () => {
  const setupChat = async () => {
    const commerce = await authCommerce();
    const consumer = await authConsumer();
    const cat = await createCategory({ name: "Verduras" });
    const pub = await createPublication(commerce.id, {
      title: "Mix",
      description: "desc",
      original_price: 2000,
      final_price: 1000,
      expiry_date: new Date(Date.now() + 86400000),
      category_id: cat.id,
    });
    const order = await createOrder(consumer.id, pub.id);
    return { commerce, consumer, orderId: order.id };
  };

  it("envía un mensaje, lista mensajes y lista chats", async () => {
    const { consumer, orderId } = await setupChat();

    const send = await request(app)
      .post(`/api/v1/chats/${orderId}/messages`)
      .set("Authorization", bearer(consumer.token))
      .send({ content: "Hola, ¿sigue disponible?" });
    expect(send.status).toBe(201);

    const messages = await request(app)
      .get(`/api/v1/chats/${orderId}/messages`)
      .set("Authorization", bearer(consumer.token));
    expect(messages.status).toBe(200);

    const chats = await request(app)
      .get("/api/v1/chats")
      .set("Authorization", bearer(consumer.token));
    expect(chats.status).toBe(200);
    expect(chats.body.chats).toHaveLength(1);
  });

  it("devuelve 400 al enviar mensaje sin content (validate)", async () => {
    const { consumer, orderId } = await setupChat();
    const res = await request(app)
      .post(`/api/v1/chats/${orderId}/messages`)
      .set("Authorization", bearer(consumer.token))
      .send({});
    expect(res.status).toBe(400);
  });
});
