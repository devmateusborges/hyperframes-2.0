import { describe, it, expect } from "bun:test";
import { validateRenderRequest, isValidationError } from "./validation.js";

describe("validateRenderRequest", () => {
  it("rejects missing html", () => {
    const result = validateRenderRequest({});
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) {
      expect(result.error).toContain("html");
    }
  });

  it("rejects empty html string", () => {
    const result = validateRenderRequest({ html: "   " });
    expect(isValidationError(result)).toBe(true);
  });

  it("rejects width > 1920", () => {
    const result = validateRenderRequest({ html: "<html></html>", options: { width: 2000 } });
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) {
      expect(result.error).toContain("width");
    }
  });

  it("rejects durationHint > 60", () => {
    const result = validateRenderRequest({ html: "<html></html>", options: { durationHint: 120 } });
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) {
      expect(result.error).toContain("durationHint");
    }
  });

  it("rejects fps > 60", () => {
    const result = validateRenderRequest({ html: "<html></html>", options: { fps: 120 } });
    expect(isValidationError(result)).toBe(true);
  });

  it("accepts valid request with defaults", () => {
    const result = validateRenderRequest({ html: "<html></html>" });
    expect(isValidationError(result)).toBe(false);
    if (!isValidationError(result)) {
      expect(result.html).toBe("<html></html>");
    }
  });

  it("accepts valid request with options", () => {
    const result = validateRenderRequest({
      html: "<html></html>",
      options: { width: 1080, height: 1920, fps: 25, quality: "draft", durationHint: 5 },
    });
    expect(isValidationError(result)).toBe(false);
  });
});
