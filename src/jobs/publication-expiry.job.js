import cron from "node-cron";
import { Publication } from "#models/publication.model.js";
import { createNotification } from "#services/notification.service.js";
import { Notification } from "#models/notification.model.js";

// Marca como EXPIRED las publicaciones ACTIVE vencidas y notifica al comercio
export const runExpiredJob = async () => {
  const now = new Date();
  const expired = await Publication.find({ status: "ACTIVE", expiry_date: { $lte: now } });

  for (const pub of expired) {
    await Publication.findByIdAndUpdate(pub._id, { status: "EXPIRED" });
    await createNotification({
      userId: pub.commerce_id,
      type: "PUBLICATION_EXPIRED",
      title: "Publicación vencida",
      message: `Tu publicación "${pub.title}" ha vencido y fue marcada como expirada.`,
      referenceId: pub._id,
      referenceType: "PUBLICATION",
    }).catch(() => {});
  }

  return expired.length;
};

// Notifica al comercio cuando una publicación vence en las próximas 24hs (solo una vez)
export const runExpiringJob = async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const expiring = await Publication.find({
    status: "ACTIVE",
    expiry_date: { $gt: now, $lte: in24h },
  });

  let notified = 0;
  for (const pub of expiring) {
    // Evita duplicar la notificación si ya fue enviada
    const alreadyNotified = await Notification.findOne({
      user_id: pub.commerce_id,
      type: "PUBLICATION_EXPIRING",
      reference_id: pub._id,
    });
    if (alreadyNotified) continue;

    await createNotification({
      userId: pub.commerce_id,
      type: "PUBLICATION_EXPIRING",
      title: "Publicación por vencer",
      message: `Tu publicación "${pub.title}" vence en menos de 24 horas.`,
      referenceId: pub._id,
      referenceType: "PUBLICATION",
    }).catch(() => {});
    notified++;
  }

  return notified;
};

// Programa ambos jobs: cada hora
export const startPublicationJobs = () => {
  cron.schedule("0 * * * *", async () => {
    await runExpiredJob().catch(console.error);
    await runExpiringJob().catch(console.error);
  });
};
