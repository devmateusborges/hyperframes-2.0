import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { loadConfig, type ApiConfig } from "./config.js";

export function createApp() {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  return app;
}

export function startServer(config?: ApiConfig) {
  const cfg = config ?? loadConfig();
  const app = createApp();

  return serve({
    fetch: app.fetch,
    port: cfg.port,
  });
}
