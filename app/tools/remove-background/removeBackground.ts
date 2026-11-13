// Background removal pipeline — runs ENTIRELY in the visitor's browser.
// No image is ever uploaded anywhere: the ONNX model and the WASM runtime
// are downloaded from this site's own origin, cached by the browser, and
// inference runs locally on the visitor's device.
//
// Runtime: onnxruntime-web (MIT) — https://github.com/microsoft/onnxruntime
// Model: U²-Net small ("u2netp"), Apache-2.0, Copyright (c) 2020 Xuebin Qin.
//   Source: https://github.com/xuebinqin/U-2-Net
//   Weights file: the unmodified ONNX release redistributed by the
//   MIT-licensed rembg project:
//   https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
//   SHA-256: 309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8
//   MD5: 8e83ca70e441ab06c318d82300c84806
//   Self-hosted at /models/u2netp.onnx — no third-party CDN at runtime.
//   See public/models/NOTICE.txt for the full attribution.
//
// Deliberately NOT used: @imgly/background-removal (AGPL-3.0, copyleft)
// and BRIA RMBG-1.4 weights (non-commercial licence).
//
// The model takes a 320x320 RGB image, normalised with ImageNet mean/std,
// and returns a single-channel foreground mask. Preprocessing and the
// min-max mask normalisation follow rembg's U²-Net session exactly.
// The pipeline is verified by an offline smoke test (Python onnxruntime)
// against the same file and the same preprocessing — see the PR body.

type OrtModule = typeof import("onnxruntime-web/wasm");
// The session instance type, derived from the factory's create() return.
type InferenceSession = Awaited<ReturnType<OrtModule["InferenceSession"]["create"]>>;

const MODEL_URL = "/models/u2netp.onnx";
const MODEL_CACHE = "springdrill-bg-remover-v1";
const MODEL_INPUT_SIZE = 320;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let ortPromise: Promise<OrtModule> | null = null;
let sessionPromise: Promise<InferenceSession> | null = null;

// Load the ONNX Runtime Web (WASM-only build) on demand. The import lives
// inside this function so the runtime is never bundled into the page's
// initial JavaScript and never touches server-side rendering.
function loadOrt(): Promise<OrtModule> {
  if (!ortPromise) {
    ortPromise = import("onnxruntime-web/wasm").then((ort) => {
      // Runtime assets are self-hosted under /ort/ (same origin, same
      // version as the npm package — the .mjs glue and .wasm binary must
      // match). Single thread: no cross-origin isolation headers needed,
      // so the tool works on every page of the site as-is.
      ort.env.wasm.wasmPaths = "/ort/";
      ort.env.wasm.numThreads = 1;
      return ort;
    });
    // A failed load must not poison later retries.
    ortPromise.catch(() => {
      ortPromise = null;
    });
  }
  return ortPromise;
}

// Fetch the model weights, reporting download progress, and cache them in
// the browser's Cache Storage so later visits skip the download entirely.
// Cache failures are best-effort and never fail the tool.
async function fetchModelBytes(
  onProgress?: (loaded: number, total: number | null) => void,
): Promise<ArrayBuffer> {
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(MODEL_CACHE);
      const hit = await cache.match(MODEL_URL);
      if (hit) return await hit.arrayBuffer();
    } catch {
      // Fall through to the network.
    }
  }
  const res = await fetch(MODEL_URL);
  if (!res.ok) {
    throw new Error(`Could not download the removal model (HTTP ${res.status}). Check your connection and try again.`);
  }
  const total = Number(res.headers.get("content-length")) || null;
  let buf: ArrayBuffer;
  if (res.body && typeof ReadableStream !== "undefined") {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded, total);
    }
    const merged = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    buf = merged.buffer;
  } else {
    buf = await res.arrayBuffer();
  }
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(MODEL_CACHE);
      await cache.put(
        MODEL_URL,
        new Response(buf.slice(0), { headers: { "content-type": "application/octet-stream" } }),
      );
    } catch {
      // Ignore cache failures.
    }
  }
  return buf;
}

export type BgStatusHandler = (message: string, fraction: number | null) => void;

async function getSession(onStatus: BgStatusHandler): Promise<{ ort: OrtModule; session: InferenceSession }> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      if (typeof WebAssembly === "undefined") {
        throw new Error("This browser cannot run the background remover (WebAssembly is not available). Please try a recent Chrome, Edge, Firefox or Safari.");
      }
      const ort = await loadOrt();
      onStatus("Downloading the removal engine (about 20 MB, first time only)…", 0);
      const bytes = await fetchModelBytes((loaded, total) => {
        onStatus(
          total ? `Downloading the removal engine (${Math.round((loaded / total) * 100)}%)…` : "Downloading the removal engine…",
          total ? loaded / total : null,
        );
      });
      // The WASM engine (~15 MB, first time only, then cached) downloads
      // inside session creation; yield so the status text paints first.
      onStatus("Starting the removal engine (first time only)…", null);
      await new Promise((resolve) => setTimeout(resolve, 30));
      return ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
    })();
    sessionPromise.catch(() => {
      sessionPromise = null;
    });
  }
  const ort = await loadOrt();
  const session = await sessionPromise;
  return { ort, session };
}

export interface RemovalResult {
  blob: Blob;
  width: number;
  height: number;
}

// Remove the background from an image. `source` is drawn at `maxDimension`
// (longest side) and the returned PNG matches that size. Runs fully
// offline after the first load; the image never leaves the device.
export async function removeBackground(
  source: ImageBitmap | HTMLImageElement,
  maxDimension: number,
  onStatus: BgStatusHandler,
): Promise<RemovalResult> {
  const naturalWidth = source instanceof ImageBitmap ? source.width : source.naturalWidth;
  const naturalHeight = source instanceof ImageBitmap ? source.height : source.naturalHeight;
  if (!naturalWidth || !naturalHeight) {
    throw new Error("Could not read that image. Please try a different photo.");
  }
  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  // Draw the (possibly downscaled) photo once; this canvas is both the
  // inference source and the base the mask is composited onto.
  const photoCanvas = document.createElement("canvas");
  photoCanvas.width = width;
  photoCanvas.height = height;
  const photoCtx = photoCanvas.getContext("2d", { willReadFrequently: true });
  if (!photoCtx) throw new Error("This browser could not prepare the photo for processing.");
  photoCtx.drawImage(source, 0, 0, width, height);
  const photoData = photoCtx.getImageData(0, 0, width, height);

  const { ort, session } = await getSession(onStatus);

  // Resize to the model's 320x320 input and normalise (ImageNet mean/std,
  // NCHW float32), exactly as rembg does.
  const inputCanvas = document.createElement("canvas");
  inputCanvas.width = MODEL_INPUT_SIZE;
  inputCanvas.height = MODEL_INPUT_SIZE;
  const inputCtx = inputCanvas.getContext("2d", { willReadFrequently: true });
  if (!inputCtx) throw new Error("This browser could not prepare the photo for processing.");
  inputCtx.drawImage(photoCanvas, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const inputData = inputCtx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const pixels = inputData.data;
  const input = new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
  for (let i = 0; i < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; i++) {
    const r = pixels[i * 4] / 255;
    const g = pixels[i * 4 + 1] / 255;
    const b = pixels[i * 4 + 2] / 255;
    input[i] = (r - MEAN[0]) / STD[0];
    input[MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + i] = (g - MEAN[1]) / STD[1];
    input[2 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + i] = (b - MEAN[2]) / STD[2];
  }

  onStatus("Removing the background… this takes a few seconds.", null);
  // Yield so the status paints before the blocking inference run.
  await new Promise((resolve) => setTimeout(resolve, 30));
  const feeds = {
    [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]),
  };
  const results = await session.run(feeds);
  const output = results[session.outputNames[0]].data as Float32Array;

  // Min-max normalise the raw mask to 0..1 (rembg behaviour — robust
  // whether the model output is logits or already a probability map).
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < output.length; i++) {
    if (output[i] < min) min = output[i];
    if (output[i] > max) max = output[i];
  }
  const range = max - min || 1;

  // Build the mask at model resolution, then upscale it smoothly to the
  // photo size and use it as the alpha channel.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = MODEL_INPUT_SIZE;
  maskCanvas.height = MODEL_INPUT_SIZE;
  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskCtx) throw new Error("This browser could not finish processing the photo.");
  const maskImage = maskCtx.createImageData(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  for (let i = 0; i < output.length; i++) {
    maskImage.data[i * 4 + 3] = Math.round(((output[i] - min) / range) * 255);
  }
  maskCtx.putImageData(maskImage, 0, 0);
  const fullMaskCanvas = document.createElement("canvas");
  fullMaskCanvas.width = width;
  fullMaskCanvas.height = height;
  const fullMaskCtx = fullMaskCanvas.getContext("2d", { willReadFrequently: true });
  if (!fullMaskCtx) throw new Error("This browser could not finish processing the photo.");
  fullMaskCtx.imageSmoothingEnabled = true;
  fullMaskCtx.imageSmoothingQuality = "high";
  fullMaskCtx.drawImage(maskCanvas, 0, 0, width, height);
  const fullMask = fullMaskCtx.getImageData(0, 0, width, height);

  const outData = photoCtx.createImageData(width, height);
  outData.data.set(photoData.data);
  for (let i = 0; i < width * height; i++) {
    outData.data[i * 4 + 3] = fullMask.data[i * 4 + 3];
  }
  photoCtx.putImageData(outData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => photoCanvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not save the finished image. Please try again.");
  return { blob, width, height };
}

// Fire-and-forget ping to the site's own keepalive endpoint, called ONLY
// after a successful removal. /api/keepalive runs a real Supabase query,
// so each tool use resets Supabase's 7-day inactivity clock. This must
// never block the tool, never surface an error, and never affect the
// download: every failure path is silently swallowed, and there is no UI.
export function pingKeepalive(): void {
  try {
    if (typeof fetch === "undefined") return;
    fetch("/api/keepalive", { method: "GET", keepalive: true, cache: "no-store" }).catch(() => {});
  } catch {
    // Never throw.
  }
}
