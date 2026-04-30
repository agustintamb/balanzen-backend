import { Publication } from "#models/publication.model.js";
import { Order } from "#models/order.model.js";

const getCommerceSummary = async (commerceId) => {
  const [
    total_publications,
    active_publications,
    total_reservations,
    total_delivered,
    total_cancelled,
  ] = await Promise.all([
    Publication.countDocuments({ commerce_id: commerceId }),
    Publication.countDocuments({ commerce_id: commerceId, status: "ACTIVE" }),
    Order.countDocuments({ commerce_id: commerceId }),
    Order.countDocuments({ commerce_id: commerceId, status: "DELIVERED" }),
    Order.countDocuments({ commerce_id: commerceId, status: "CANCELLED" }),
  ]);

  const conversion_rate =
    total_reservations > 0 ? Math.round((total_delivered / total_reservations) * 1000) / 10 : 0;

  return {
    total_publications,
    active_publications,
    total_reservations,
    total_delivered,
    total_cancelled,
    conversion_rate,
  };
};

export { getCommerceSummary };
