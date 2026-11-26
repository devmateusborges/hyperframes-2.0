import { createReadStream, rmSync, existsSync, statSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { loadConfig, type ApiConfig } from "./config.js";
import { validateRenderRequest, isValidationError } from "./validation.js";
import { renderScene } from "./renderScene.js";
import { Semaphore } from "./semaphore.js";

export function createApp(config?: ApiConfig) {
  const cfg = config ?? loadConfig();
  const app = new Hono();
  const semaphore = new Semaphore(cfg.maxConcurrentRenders);

  app.onError((err, c) => {
    console.error("Unhandled error:", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  app.get("/health", (c) => c.json({ status: "ok" }));

  if (cfg.apiSecret) {
    const secretBuf = Buffer.from(cfg.apiSecret);
    const publicPaths = new Set(["/health", "/render-scene/queue"]);
    app.use("*", async (c, next) => {
      if (publicPaths.has(c.req.path)) return next();
      const header = c.req.header("x-api-secret") ?? "";
      const headerBuf = Buffer.from(header);
      if (headerBuf.length !== secretBuf.length || !timingSafeEqual(headerBuf, secretBuf)) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      return next();
    });
  }

  app.get("/render-scene/queue", (c) =>
    c.json({ active: semaphore.active, waiting: semaphore.waiting, max: semaphore.max }),
  );

  app.post("/render-scene", async (c) => {
    const contentLengthHeader = c.req.header("content-length");
    if (contentLengthHeader && parseInt(contentLengthHeader, 10) > cfg.maxBodySizeBytes) {
      return c.json({ error: "Request body too large" }, 413);
    }

    let rawBody: string;
    try {
      rawBody = await c.req.text();
    } catch {
      return c.json({ error: "Failed to read request body" }, 400);
    }

    if (rawBody.length > cfg.maxBodySizeBytes) {
      return c.json({ error: "Request body too large" }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    const validated = validateRenderRequest(body);
    if (isValidationError(validated)) {
      return c.json(validated, 400);
    }

    const release = await semaphore.acquire();
    let outputPath: string;
    try {
      const abortSignal = AbortSignal.timeout(cfg.renderTimeoutMs);
      outputPath = await renderScene(validated.html, validated.options ?? {}, cfg, abortSignal);
    } catch (err) {
      release();
      if (err instanceof DOMException && err.name === "TimeoutError") {
        return c.json({ error: "Render timed out" }, 504);
      }
      console.error("Render failed:", err);
      return c.json({ error: "Render failed" }, 500);
    }

    release();

    if (!existsSync(outputPath)) {
      return c.json({ error: "Render produced no output" }, 500);
    }

    const stat = statSync(outputPath);
    c.header("Content-Type", "application/octet-stream");
    c.header("Content-Disposition", 'attachment; filename="scene.mp4"');
    c.header("Content-Length", String(stat.size));

    return stream(c, async (s) => {
      try {
        const readable = createReadStream(outputPath);
        for await (const chunk of readable) {
          await s.write(chunk);
        }
      } finally {
        try { rmSync(outputPath); } catch {}
        const dir = outputPath.replace(/\/[^/]+$/, "");
        try { rmSync(dir, { recursive: true }); } catch {}
      }
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
