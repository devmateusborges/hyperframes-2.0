import { createReadStream, rmSync, existsSync, statSync } from "node:fs";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { loadConfig, type ApiConfig } from "./config.js";
import { validateRenderRequest, isValidationError } from "./validation.js";
import { renderScene } from "./renderScene.js";

export function createApp(config?: ApiConfig) {
  const cfg = config ?? loadConfig();
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.post("/render-scene", async (c) => {
    const contentLength = parseInt(c.req.header("content-length") || "0", 10);
    if (contentLength > cfg.maxBodySizeBytes) {
      return c.json({ error: "Request body too large" }, 413);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    const validated = validateRenderRequest(body);
    if (isValidationError(validated)) {
      return c.json(validated, 400);
    }

    let outputPath: string;
    try {
      outputPath = await renderScene(validated.html, validated.options ?? {}, cfg);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed";
      return c.json({ error: message }, 500);
    }

    if (!existsSync(outputPath)) {
      return c.json({ error: "Render produced no output" }, 500);
    }

    const stat = statSync(outputPath);
    c.header("Content-Type", "application/octet-stream");
    c.header("Content-Disposition", 'attachment; filename="scene.mp4"');
    c.header("Content-Length", String(stat.size));

    return stream(c, async (s) => {
      const readable = createReadStream(outputPath);
      for await (const chunk of readable) {
        await s.write(chunk);
      }
      try { rmSync(outputPath); } catch {}
      const dir = outputPath.replace(/\/[^/]+$/, "");
      try { rmSync(dir, { recursive: true }); } catch {}
    });
  });

  return app;
}

export function startServer(config?: ApiConfig) {
  const cfg = config ?? loadConfig();
  const app = createApp(cfg);

  return serve({
    fetch: app.fetch,
    port: cfg.port,
  });
}
