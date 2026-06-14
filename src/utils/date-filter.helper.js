const buildDateFilter = (date_from, date_to) => {
  if (!date_from && !date_to) return null;
  const dateFilter = {};
  if (date_from) dateFilter.$gte = new Date(date_from);
  if (date_to) dateFilter.$lte = new Date(date_to);
  return dateFilter;
};

export { buildDateFilter };
