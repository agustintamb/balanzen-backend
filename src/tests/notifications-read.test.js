import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register } from "#services/auth.service.js";
import {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
} from "#services/notification.service.js";

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

const CONSUMIDOR_DATA = {
  role: "CONSUMIDOR",
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@mail.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1155667788",
  dni: "35123456",
};

let commerceId;
let consumerId;

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const setup = async () => {
  const [commerce, consumer] = await Promise.all([
    register(COMERCIO_DATA),
    register(CONSUMIDOR_DATA),
  ]);
  commerceId = commerce.id;
  consumerId = consumer.id;
};

describe("markAsRead", () => {
  it("marca una notificación como leída", async () => {
    await setup();
    const notif = await createNotification({
      userId: commerceId,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Reserva recibida.",
    });

    await markAsRead(notif._id, commerceId);

    const result = await listNotifications(commerceId, {});
    expect(result.notifications[0].read).toBe(true);
    expect(result.unread_count).toBe(0);
  });

  it("lanza 403 si la notificación no pertenece al usuario", async () => {
    await setup();
    const notif = await createNotification({
      userId: commerceId,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Reserva recibida.",
    });

    await expect(markAsRead(notif._id, consumerId)).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 si la notificación no existe", async () => {
    await setup();
    await expect(markAsRead("id-inexistente", commerceId)).rejects.toMatchObject({ status: 404 });
  });
});

describe("markAllAsRead", () => {
  it("marca todas las notificaciones no leídas del usuario", async () => {
    await setup();
    await Promise.all([
      createNotification({
        userId: commerceId,
        type: "NEW_RESERVATION",
        title: "Reserva 1",
        message: "Primera reserva.",
      }),
      createNotification({
        userId: commerceId,
        type: "NEW_RESERVATION",
        title: "Reserva 2",
        message: "Segunda reserva.",
      }),
    ]);

    const result = await markAllAsRead(commerceId);
    expect(result.updated).toBe(2);

    const after = await listNotifications(commerceId, {});
    expect(after.unread_count).toBe(0);
  });

  it("retorna updated: 0 si no hay notificaciones no leídas", async () => {
    await setup();
    const result = await markAllAsRead(commerceId);
    expect(result.updated).toBe(0);
  });
});
