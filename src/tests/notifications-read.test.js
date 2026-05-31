import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
} from "#services/notification.service.js";
import { setupTwoUsers } from "#tests/helpers/fixtures.helper.js";

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("markAsRead", () => {
  it("marca una notificación como leída", async () => {
    const { commerceId } = await setupTwoUsers();
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
    const { commerceId, consumerId } = await setupTwoUsers();
    const notif = await createNotification({
      userId: commerceId,
      type: "NEW_RESERVATION",
      title: "Nueva reserva",
      message: "Reserva recibida.",
    });

    await expect(markAsRead(notif._id, consumerId)).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 si la notificación no existe", async () => {
    const { commerceId } = await setupTwoUsers();
    await expect(markAsRead("id-inexistente", commerceId)).rejects.toMatchObject({ status: 404 });
  });
});

describe("markAllAsRead", () => {
  it("marca todas las notificaciones no leídas del usuario", async () => {
    const { commerceId } = await setupTwoUsers();
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
    const { commerceId } = await setupTwoUsers();
    const result = await markAllAsRead(commerceId);
    expect(result.updated).toBe(0);
  });
});
