import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { connectDB, disconnectDB, clearDB } from "#tests/helpers/db.helper.js";
import { register, login, changePassword } from "#services/auth.service.js";

const CONSUMIDOR_BASE = {
  role: "CONSUMIDOR",
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@mail.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1155667788",
  dni: "35123456",
};

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe("changePassword", () => {
  it("cambia la contraseña y permite login con la nueva", async () => {
    const reg = await register(CONSUMIDOR_BASE);
    await changePassword(reg.id, {
      current_password: "miPass123",
      new_password: "nuevoPass456",
      confirm_password: "nuevoPass456",
    });
    await expect(login("juan@mail.com", "nuevoPass456")).resolves.toBeDefined();
  });

  it("lanza 401 si la contraseña actual es incorrecta", async () => {
    const reg = await register(CONSUMIDOR_BASE);
    await expect(
      changePassword(reg.id, {
        current_password: "passwordMal",
        new_password: "nuevoPass456",
        confirm_password: "nuevoPass456",
      })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("lanza 400 si new_password y confirm_password no coinciden", async () => {
    const reg = await register(CONSUMIDOR_BASE);
    await expect(
      changePassword(reg.id, {
        current_password: "miPass123",
        new_password: "nuevoPass456",
        confirm_password: "diferente",
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});
