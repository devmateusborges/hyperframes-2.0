export interface RenderSceneOptions {
  width?: number;
  height?: number;
  fps?: number;
  quality?: "draft" | "standard" | "high";
  format?: "mp4";
  durationHint?: number;
}

export interface RenderSceneRequest {
  html: string;
  options?: RenderSceneOptions;
}

export interface ValidationError {
  error: string;
}

export function validateRenderRequest(
  body: unknown,
): RenderSceneRequest | ValidationError {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.html !== "string" || b.html.trim().length === 0) {
    return { error: "html is required and must be a non-empty string" };
  }

  const opts = (b.options ?? {}) as Record<string, unknown>;

  if (opts.width !== undefined) {
    if (typeof opts.width !== "number" || opts.width < 1 || opts.width > 1920) {
      return { error: "width must be between 1 and 1920" };
    }
  }

  if (opts.height !== undefined) {
    if (typeof opts.height !== "number" || opts.height < 1 || opts.height > 1920) {
      return { error: "height must be between 1 and 1920" };
    }
  }

  if (opts.fps !== undefined) {
    if (typeof opts.fps !== "number" || opts.fps < 1 || opts.fps > 60) {
      return { error: "fps must be between 1 and 60" };
    }
  }

  if (opts.durationHint !== undefined) {
    if (typeof opts.durationHint !== "number" || opts.durationHint <= 0 || opts.durationHint > 60) {
      return { error: "durationHint must be between 0 and 60 seconds" };
    }
  }

  if (opts.quality !== undefined) {
    if (!["draft", "standard", "high"].includes(opts.quality as string)) {
      return { error: "quality must be draft, standard, or high" };
    }
  }

  return {
    html: b.html as string,
    options: opts as RenderSceneOptions,
  };
}

export function isValidationError(result: RenderSceneRequest | ValidationError): result is ValidationError {
  return "error" in result;
}
