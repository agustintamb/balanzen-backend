import { describe, it, expect, vi, afterEach } from "vitest";
import errorHandler from "#middlewares/error.middleware.js";
import envConfig from "#config/env.config.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

afterEach(() => {
  envConfig.env = "test"; // restaurar tras los tests que mutan el ambiente
});

describe("errorHandler", () => {
  it("mapea errores de CORS a 403", () => {
    const res = mockRes();
    errorHandler({ message: "CORS bloqueado para origin: x" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("mapea ValidationError de Mongoose a 400", () => {
    const res = mockRes();
    errorHandler({ name: "ValidationError", message: "campo inválido" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("mapea duplicate key (11000) a 409", () => {
    const res = mockRes();
    errorHandler({ code: 11000 }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Registro duplicado" });
  });

  it("usa err.status cuando está presente e incluye stack fuera de producción", () => {
    const res = mockRes();
    errorHandler({ status: 404, message: "no encontrado", stack: "STACK" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, message: "no encontrado" });
    expect(res.json.mock.calls[0][0].stack).toBe("STACK");
  });

  it("cae a 500 cuando no hay status", () => {
    const res = mockRes();
    errorHandler({ message: "boom" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("enmascara el mensaje y omite el stack en producción", () => {
    envConfig.env = "production";
    const res = mockRes();
    errorHandler({ status: 500, message: "detalle interno", stack: "STACK" }, {}, res, () => {});
    const payload = res.json.mock.calls[0][0];
    expect(payload.message).toBe("Error interno del servidor");
    expect(payload.stack).toBeUndefined();
  });
});
