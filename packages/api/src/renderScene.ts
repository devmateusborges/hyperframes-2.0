import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createRenderJob,
  executeRenderJob,
  resolveConfig as resolveEngineConfig,
} from "@hyperframes/producer";
import type { RenderSceneOptions } from "./validation.js";
import type { ApiConfig } from "./config.js";

export async function renderScene(
  html: string,
  options: RenderSceneOptions,
  config: ApiConfig,
  abortSignal?: AbortSignal,
): Promise<string> {
  const width = options.width ?? 1080;
  const height = options.height ?? 1920;
  const fps = options.fps ?? config.defaultFps;
  const quality = options.quality ?? config.defaultQuality;

  const projectDir = mkdtempSync(join(tmpdir(), "hf-scene-"));
  const outputPath = join(projectDir, "output.mp4");

  writeFileSync(join(projectDir, "index.html"), html, "utf-8");

  const producerConfig = resolveEngineConfig({
    width,
    height,
  });

  const job = createRenderJob({
    fps,
    quality,
    format: "mp4",
    producerConfig,
  });

  try {
    await executeRenderJob(job, projectDir, outputPath, undefined, abortSignal);
  } catch (err) {
    try { rmSync(projectDir, { recursive: true }); } catch {}
    throw err;
  }

  const indexPath = join(projectDir, "index.html");
  if (existsSync(indexPath)) {
    try { rmSync(indexPath); } catch {}
  }

  return outputPath;
}
