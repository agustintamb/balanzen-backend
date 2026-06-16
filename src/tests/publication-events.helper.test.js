import { describe, it, expect } from "vitest";
import { broadcastPublicationChanged } from "#utils/publication-events.helper.js";

describe("broadcastPublicationChanged", () => {
  it("no lanza si io no está inicializado (contexto de tests)", () => {
    expect(() => broadcastPublicationChanged("pub-id", "CANCELLED")).not.toThrow();
  });

  it("no lanza cuando se omite el status", () => {
    expect(() => broadcastPublicationChanged("pub-id")).not.toThrow();
  });
});
