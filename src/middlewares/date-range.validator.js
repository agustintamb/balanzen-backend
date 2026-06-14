import { query } from "express-validator";

const dateRangeValidators = [
  query("date_from")
    .optional()
    .isISO8601()
    .withMessage("date_from debe ser una fecha ISO 8601 válida"),
  query("date_to")
    .optional()
    .isISO8601()
    .withMessage("date_to debe ser una fecha ISO 8601 válida")
    .custom((value, { req }) => {
      if (req.query.date_from && new Date(value) < new Date(req.query.date_from)) {
        throw new Error("date_to debe ser mayor o igual a date_from");
      }
      return true;
    }),
];

export default dateRangeValidators;
