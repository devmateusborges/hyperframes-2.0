export interface ApiConfig {
  port: number;
  maxConcurrentRenders: number;
  maxBodySizeBytes: number;
  renderTimeoutMs: number;
  defaultFps: number;
  defaultQuality: "draft" | "standard" | "high";
  apiSecret?: string;
}

export function loadConfig(): ApiConfig {
  return {
    port: parseInt(process.env.PORT || "8080", 10),
    maxConcurrentRenders: parseInt(process.env.MAX_CONCURRENT_RENDERS || "2", 10),
    maxBodySizeBytes: parseInt(process.env.MAX_BODY_SIZE || String(5 * 1024 * 1024), 10),
    renderTimeoutMs: parseInt(process.env.RENDER_TIMEOUT_MS || "30000", 10),
    defaultFps: parseInt(process.env.DEFAULT_FPS || "25", 10),
    defaultQuality: (process.env.DEFAULT_QUALITY as ApiConfig["defaultQuality"]) || "standard",
    apiSecret: process.env.API_SECRET || undefined,
  };
}
