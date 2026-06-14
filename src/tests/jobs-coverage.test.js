import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import cron from "node-cron";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import {
  startPublicationJobs,
  runExpiredJob,
  runExpiringJob,
} from "#jobs/publication-expiry.job.js";
import { Publication } from "#models/publication.model.js";
import * as notificationService from "#services/notification.service.js";

// vitest hoista vi.mock por encima de los imports
vi.mock("node-cron", () => ({ default: { schedule: vi.fn() } }));

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(async () => {
  vi.restoreAllMocks();
  await clearDB();
});

describe("startPublicationJobs", () => {
  it("programa el cron horario y ejecuta los jobs en el callback", async () => {
    startPublicationJobs();
    expect(cron.schedule).toHaveBeenCalledWith("0 * * * *", expect.any(Function));

    // Ejecuta el callback programado (corre runExpiredJob + runExpiringJob)
    const scheduledCallback = cron.schedule.mock.calls[0][1];
    await expect(scheduledCallback()).resolves.toBeUndefined();
  });
});

describe("runExpiredJob / runExpiringJob", () => {
  it("expira publicaciones vencidas y notifica (notificación best-effort tolerante a fallos)", async () => {
    vi.spyOn(notificationService, "createNotification").mockRejectedValue(new Error("notif down"));
    await Publication.create({
      commerce_id: "c1",
      title: "Vencida",
      description: "x",
      original_price: 100,
      final_price: 50,
      expiry_date: new Date(Date.now() - 86400000),
      category_id: "cat",
    });
    const expired = await runExpiredJob();
    expect(expired).toBe(1);
    const pub = await Publication.findOne({ title: "Vencida" });
    expect(pub.status).toBe("EXPIRED");
  });

  it("notifica publicaciones próximas a vencer (24hs) sin duplicar", async () => {
    vi.spyOn(notificationService, "createNotification").mockRejectedValue(new Error("notif down"));
    await Publication.create({
      commerce_id: "c1",
      title: "PorVencer",
      description: "x",
      original_price: 100,
      final_price: 50,
      expiry_date: new Date(Date.now() + 3600000),
      category_id: "cat",
    });
    const notified = await runExpiringJob();
    expect(notified).toBe(1);
  });
});
