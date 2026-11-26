import { describe, it, expect } from "bun:test";
import { createApp } from "./server.js";
import { loadConfig } from "./config.js";

const appWithAuth = createApp({
  ...loadConfig(),
  apiSecret: "test-secret",
});

const appNoAuth = createApp(loadConfig());

describe("Auth middleware", () => {
  it("rejects render without x-api-secret header when secret is set", async () => {
    const res = await appWithAuth.request("/render-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: "<html></html>" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("rejects render with wrong x-api-secret", async () => {
    const res = await appWithAuth.request("/render-scene", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": "wrong-secret",
      },
      body: JSON.stringify({ html: "<html></html>" }),
    });
    expect(res.status).toBe(401);
  });

  it("allows /health without auth", async () => {
    const res = await appWithAuth.request("/health");
    expect(res.status).toBe(200);
  });

  it("allows /render-scene/queue without auth", async () => {
    const res = await appWithAuth.request("/render-scene/queue");
    expect(res.status).toBe(200);
  });

  it("skips auth when no secret configured", async () => {
    const res = await appNoAuth.request("/render-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: "<html></html>" }),
    });
    expect(res.status).not.toBe(401);
  });
});
