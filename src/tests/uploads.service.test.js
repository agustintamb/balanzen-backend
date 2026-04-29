import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadImage, deleteImage } from "#services/uploads.service.js";

describe("uploadImage", () => {
  it("retorna la URL del archivo subido", () => {
    const file = {
      path: "https://res.cloudinary.com/demo/image/upload/v123/balanzen/local/image/sample.jpg",
    };
    const result = uploadImage(file);
    expect(result.url).toBe(file.path);
  });

  it("lanza 400 si no se recibe archivo", () => {
    expect(() => uploadImage(null)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => uploadImage(undefined)).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe("deleteImage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lanza 400 si no se provee URL", async () => {
    await expect(deleteImage(null)).rejects.toMatchObject({ status: 400 });
    await expect(deleteImage("")).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 si la URL no tiene formato válido de Cloudinary", async () => {
    await expect(deleteImage("https://example.com/imagen.jpg")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("llama a cloudinary.uploader.destroy con el public_id correcto", async () => {
    const { cloudinary } = await import("#config/cloudinary.config.js");
    cloudinary.uploader.destroy = vi.fn().mockResolvedValue({ result: "ok" });

    await deleteImage(
      "https://res.cloudinary.com/demo/image/upload/v123/balanzen/local/image/sample.jpg"
    );

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("balanzen/local/image/sample");
  });
});
