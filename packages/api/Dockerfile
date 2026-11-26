# HyperFrames API — HTML→MP4 render engine.
#
# Build context is the REPOSITORY ROOT:
#   docker build -f packages/api/Dockerfile -t hyperframes-api .

FROM node:22.23.5-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS beginframe-contract

# ── System dependencies ──────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    unzip \
    xz-utils \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libcups2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    libgtk-3-0 \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    fonts-noto-core \
    fonts-noto-extra \
    fonts-noto-ui-core \
    fonts-freefont-ttf \
    fonts-dejavu-core \
    fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && fc-cache -fv

# ── FFmpeg (pinned) ──────────────────────────────────────────────────────────
ARG TARGETARCH
ARG FFMPEG_RELEASE=https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-02-28-12-59
ARG FFMPEG_BUILD=ffmpeg-n8.0.1-66-g27b8d1a017
ARG FFMPEG_SHA256_AMD64=26d2ecd0cefba99f9d1ea92252a3a4f743a58df4c1c3cf9f8bbaaa40b1fca5b0
ARG FFMPEG_SHA256_ARM64=d72cc324cb65dd92a9ffe699cc95ccbacfef4def8d3ad9fe2b5164a6a71b9595
RUN case "$TARGETARCH" in \
      amd64) FF_ARCH=linux64; FF_SHA256="$FFMPEG_SHA256_AMD64" ;; \
      arm64) FF_ARCH=linuxarm64; FF_SHA256="$FFMPEG_SHA256_ARM64" ;; \
      *) echo "unsupported TARGETARCH '$TARGETARCH'" >&2; exit 1 ;; \
    esac \
    && curl -fsSL -o /tmp/ffmpeg.tar.xz "$FFMPEG_RELEASE/$FFMPEG_BUILD-$FF_ARCH-gpl-8.0.tar.xz" \
    && echo "$FF_SHA256  /tmp/ffmpeg.tar.xz" | sha256sum -c - \
    && tar -xJf /tmp/ffmpeg.tar.xz -C /usr/local/bin --strip-components=2 --wildcards '*/bin/ffmpeg' '*/bin/ffprobe' \
    && rm /tmp/ffmpeg.tar.xz \
    && ffmpeg -version | grep -F "ffmpeg version ${FFMPEG_BUILD#ffmpeg-}" \
    && ffprobe -version | grep -F "ffprobe version ${FFMPEG_BUILD#ffmpeg-}"

# ── chrome-headless-shell (deterministic BeginFrame capture) ─────────────────
ARG CHROME_HEADLESS_SHELL_VERSION=158.0.8127.88
ARG CHROME_HEADLESS_SHELL_SHA256_AMD64=63401333cc587645bfaeea7f0c90958b327d249251e23954a47f30112ca23d5b
ARG CHROME_HEADLESS_SHELL_SHA256_ARM64=9f89b7ef6574e4bbf6ddda9f17f1fab5626e93d6f7d852653232d0d3554df975
RUN case "$TARGETARCH" in \
      amd64) CHS_SHA256="$CHROME_HEADLESS_SHELL_SHA256_AMD64"; CHS_PLATFORM="linux64" ;; \
      arm64) CHS_SHA256="$CHROME_HEADLESS_SHELL_SHA256_ARM64"; CHS_PLATFORM="linux-arm64" ;; \
      *) echo "no pinned chrome-headless-shell for TARGETARCH '$TARGETARCH'" >&2; exit 1 ;; \
    esac \
    && curl -fsSL -o /tmp/chs.zip "https://storage.googleapis.com/chrome-for-testing-public/$CHROME_HEADLESS_SHELL_VERSION/$CHS_PLATFORM/chrome-headless-shell-$CHS_PLATFORM.zip" \
    && echo "$CHS_SHA256  /tmp/chs.zip" | sha256sum -c - \
    && unzip -q /tmp/chs.zip -d /opt \
    && rm /tmp/chs.zip \
    && mkdir -p /opt/chrome \
    && ln -s /opt/chrome-headless-shell-$CHS_PLATFORM/chrome-headless-shell /opt/chrome/chrome-headless-shell \
    && /opt/chrome/chrome-headless-shell --version | grep -F "$CHROME_HEADLESS_SHELL_VERSION"

ENV HYPERFRAMES_CHROME_PATH=/opt/chrome/chrome-headless-shell
ENV PRODUCER_HEADLESS_SHELL_PATH=/opt/chrome/chrome-headless-shell
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CONTAINER=true

WORKDIR /app

# ── Bun (pinned) ─────────────────────────────────────────────────────────────
ARG BUN_VERSION=1.4.4
ARG BUN_SHA256_AMD64=bf8ccbfb2b0b80159e0f9a6d15c55317add8077534dbc6130a3edb52fccb395c
ARG BUN_SHA256_ARM64=baa6bb36f51d6e58561e02bbea825038a9df454f673d6d776e8bbf86f8c7850e
RUN case "$TARGETARCH" in \
      amd64) BUN_ARCH=x64; BUN_SHA256="$BUN_SHA256_AMD64" ;; \
      arm64) BUN_ARCH=aarch64; BUN_SHA256="$BUN_SHA256_ARM64" ;; \
      *) echo "unsupported TARGETARCH '$TARGETARCH'" >&2; exit 1 ;; \
    esac \
    && curl -fsSL -o /tmp/bun.zip "https://github.com/oven-sh/bun/releases/download/bun-v$BUN_VERSION/bun-linux-$BUN_ARCH.zip" \
    && echo "$BUN_SHA256  /tmp/bun.zip" | sha256sum -c - \
    && mkdir -p /root/.bun/bin \
    && unzip -q -j /tmp/bun.zip "bun-linux-$BUN_ARCH/bun" -d /root/.bun/bin \
    && rm /tmp/bun.zip \
    && /root/.bun/bin/bun --version | grep -Fx "$BUN_VERSION"
ENV PATH="/root/.bun/bin:$PATH"

# ── Install workspace dependencies ──────────────────────────────────────────
COPY package.json bun.lock ./
COPY packages/share/package.json packages/share/package.json
COPY packages/share/tsconfig.json packages/share/tsconfig.json
COPY packages/share/src/ packages/share/src/
COPY packages/share/scripts/ packages/share/scripts/
COPY packages/core/package.json packages/core/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/player/package.json packages/player/package.json
COPY packages/producer/package.json packages/producer/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/studio/package.json packages/studio/package.json
COPY packages/shader-transitions/package.json packages/shader-transitions/package.json
COPY packages/aws-lambda/package.json packages/aws-lambda/package.json
COPY packages/gcp-cloud-run/package.json packages/gcp-cloud-run/package.json
COPY packages/lint/package.json packages/lint/package.json
COPY packages/parsers/package.json packages/parsers/package.json
COPY packages/parsers/src/ packages/parsers/src/
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/sdk-playground/package.json packages/sdk-playground/package.json
COPY packages/inspector/package.json packages/inspector/package.json
COPY packages/studio-server/package.json packages/studio-server/package.json
COPY packages/api/package.json packages/api/package.json
COPY scripts/package-subpaths.mjs scripts/package-subpaths.mjs
RUN timeout 300 bun install --frozen-lockfile \
    || timeout 300 bun install --frozen-lockfile

# ── BeginFrame contract probe ────────────────────────────────────────────────
COPY packages/core/ packages/core/
COPY packages/parsers/ packages/parsers/
COPY packages/engine/ packages/engine/
COPY packages/aws-lambda/scripts/probe-beginframe.ts packages/aws-lambda/scripts/probe-beginframe.ts
RUN bun -e 'import { buildChromeArgs } from "./packages/engine/src/services/browserManager.ts"; await Bun.write("/tmp/hf-api-chrome-args.json", JSON.stringify(buildChromeArgs({ width: 800, height: 600, captureMode: "beginframe", platform: "linux" }, { browserGpuMode: "software" })))' \
    && bun packages/aws-lambda/scripts/probe-beginframe.ts \
      --executable-path /opt/chrome/chrome-headless-shell \
      --launch-args-json /tmp/hf-api-chrome-args.json

# ── Build ────────────────────────────────────────────────────────────────────
FROM beginframe-contract AS runtime

COPY scripts/rewrite-relative-import-extensions.mjs scripts/rewrite-relative-import-extensions.mjs
COPY packages/core/ packages/core/
COPY packages/engine/ packages/engine/
COPY packages/producer/ packages/producer/
COPY packages/api/ packages/api/
COPY packages/lint/ packages/lint/
COPY packages/parsers/ packages/parsers/
COPY packages/sdk/ packages/sdk/
COPY packages/sdk-playground/ packages/sdk-playground/
COPY packages/studio-server/ packages/studio-server/

RUN bun run --cwd packages/parsers build \
    && bun run --cwd packages/lint build \
    && bun run --cwd packages/studio-server build \
    && bun run --cwd packages/core build \
    && bun run --cwd packages/core build:hyperframes-runtime:modular \
    && bun run --cwd packages/sdk build \
    && bun run --cwd packages/sdk-playground build \
    && bun run --cwd packages/engine build \
    && bun run --cwd packages/producer build \
    && bun run --cwd packages/api build

ENV PORT=8080
ENV PRODUCER_RESTRICT_PAGE_NETWORK=true
EXPOSE 8080

WORKDIR /app/packages/api
CMD ["bun", "dist/server.js"]
