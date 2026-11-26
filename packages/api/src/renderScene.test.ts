import { describe, it, expect } from "bun:test";
import { createApp } from "./server.js";
import { loadConfig } from "./config.js";

const app = createApp(loadConfig());

describe("POST /render-scene", () => {
  it("returns 400 for missing html", async () => {
    const res = await app.request("/render-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("html");
  });

  it("returns 400 for empty html", async () => {
    const res = await app.request("/render-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: "   " }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid options", async () => {
    const res = await app.request("/render-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: "<html></html>", options: { width: 5000 } }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("width");
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await app.request("/render-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("JSON");
  });
});

describe("POST /render-scene integration", () => {
  const hasChrome = !!process.env.CHROME_PATH || Bun.which("chrome-headless-shell");
  const hasFfmpeg = !!Bun.which("ffmpeg");

  it.skipIf(!hasChrome || !hasFfmpeg)(
    "renders a simple red screen to MP4",
    async () => {
      const html = `<!DOCTYPE html>
<html>
<body style="margin:0;background:red;width:200px;height:200px">
<script>
  window.__hf = { duration: 1, seek(t) {} };
</script>
</body>
</html>`;

      const res = await app.request("/render-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          options: { width: 200, height: 200, quality: "draft" },
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/octet-stream");
      const buffer = await res.arrayBuffer();
      const magic = new Uint8Array(buffer.slice(4, 8));
      expect(String.fromCharCode(...magic)).toBe("ftyp");
    },
    60_000,
  );
});
