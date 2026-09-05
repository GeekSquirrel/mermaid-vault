import type { Request, Response } from "express";
import { inflate } from "pako";
import {
  renderWithChromium,
  type RenderPayload,
} from "../util/renderer.js";

const decodeState = (state: string): RenderPayload => {
  // Accepts the frontend serde format "pako:<base64url(deflate(json))>" as
  // well as bare pako payloads and plain base64 JSON for robustness.
  const [prefix, encoded] = state.includes(":")
    ? (state.split(":", 2) as [string, string])
    : (["pako", state] as [string, string]);
  if (prefix !== "pako") {
    throw new Error(`Unsupported serde type: ${prefix}`);
  }
  let json: string;
  try {
    // pako's inflate is quirky with Node Buffers, so pass a plain Uint8Array
    // and decode the decompressed bytes explicitly.
    const bytes = inflate(new Uint8Array(Buffer.from(encoded, "base64url")));
    json = Buffer.from(bytes).toString("utf8");
  } catch {
    json = Buffer.from(encoded, "base64").toString("utf8");
  }
  const parsed = JSON.parse(json) as RenderPayload;
  if (typeof parsed.code !== "string" || parsed.code.trim() === "") {
    throw new Error("State does not contain a diagram code string");
  }
  return parsed;
};

const NO_CHROMIUM_HINT =
  "Rendering service unavailable: install Chromium in the backend container or set CHROMIUM_PATH.";

const sendRenderError = (res: Response, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("No Chromium executable")) {
    res.status(503).json({
      success: false,
      error: { code: "RENDER_UNAVAILABLE", message: NO_CHROMIUM_HINT },
    });
    return;
  }
  if (/TimeoutError|timed out/i.test(message)) {
    res.status(504).json({
      success: false,
      error: { code: "RENDER_TIMEOUT", message: "Diagram rendering timed out" },
    });
    return;
  }
  res.status(400).json({
    success: false,
    error: { code: "RENDER_FAILED", message },
  });
};

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export const getRenderSvg = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payload = decodeState(req.params.state);
    const { svg } = await renderWithChromium(payload, { type: "svg" });
    res
      .status(200)
      .set("Content-Type", "image/svg+xml; charset=utf-8")
      .set("Cache-Control", IMMUTABLE_CACHE)
      .send(svg);
  } catch (error) {
    sendRenderError(res, error);
  }
};

export const getRenderImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payload = decodeState(req.params.state);
    const type = req.query.type === "svg" ? "svg" : "png";
    const scale = Number(req.query.scale) || undefined;
    const result = await renderWithChromium(payload, { type, scale });
    if (type === "png") {
      const png = result.png?.replace(/^data:image\/png;base64,/, "");
      res
        .status(200)
        .set("Content-Type", "image/png")
        .set("Cache-Control", IMMUTABLE_CACHE)
        .send(Buffer.from(png ?? "", "base64"));
    } else {
      res
        .status(200)
        .set("Content-Type", "image/svg+xml; charset=utf-8")
        .set("Cache-Control", IMMUTABLE_CACHE)
        .send(result.svg);
    }
  } catch (error) {
    sendRenderError(res, error);
  }
};
