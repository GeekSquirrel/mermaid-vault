import { existsSync } from "fs";
import { createRequire } from "module";
import path from "path";
import type { Browser } from "puppeteer-core";

const require = createRequire(import.meta.url);

export interface RenderPayload {
  code: string;
  config?: unknown;
}

export interface RenderOptions {
  type?: "svg" | "png";
  scale?: number;
}

export interface RenderResult {
  svg?: string;
  png?: string;
}

// Candidate Chromium executables, in priority order. CHROMIUM_PATH always wins.
const CHROMIUM_CANDIDATES = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

export const findChromiumPath = (): string | undefined => {
  const candidates = [process.env.CHROMIUM_PATH, ...CHROMIUM_CANDIDATES].filter(
    (candidate): candidate is string => Boolean(candidate)
  );
  return candidates.find((candidate) => existsSync(candidate));
};

// The renderer page loads the mermaid ESM bundle from this static route
// (mounted in index.ts), so relative chunk imports resolve correctly.
export const RENDER_ASSETS_ROUTE = "/render-assets";
export const RENDER_PAGE_ROUTE = "/render-page";

const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS) || 30_000;

let browserPromise: Promise<Browser> | undefined;

const getBrowser = (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = (async () => {
      const executablePath = findChromiumPath();
      if (!executablePath) {
        throw new Error(
          "No Chromium executable found. Install Chromium or set CHROMIUM_PATH."
        );
      }
      const puppeteer = await import("puppeteer-core");
      return puppeteer.launch({
        args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        executablePath,
      });
    })();
    // Do not cache a failed launch: retry on the next request.
    browserPromise.catch(() => {
      browserPromise = undefined;
    });
  }
  return browserPromise;
};

// Serialize renders through a single-flight queue so parallel requests reuse
// one browser without spawning unbounded numbers of pages.
let renderQueue: Promise<unknown> = Promise.resolve();

const withQueue = <T>(task: () => Promise<T>): Promise<T> => {
  const next = renderQueue.then(task, task);
  renderQueue = next.catch(() => undefined);
  return next;
};

/**
 * Renders a diagram in headless Chromium. The payload travels in the URL hash
 * of the internally served renderer page (see renderPageHtml), which loads
 * mermaid from RENDER_ASSETS_ROUTE, renders the diagram and stores the result
 * in `window.__renderResult`.
 */
export const renderWithChromium = async (
  payload: RenderPayload,
  options: RenderOptions = {}
): Promise<RenderResult> =>
  withQueue(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      const params = new URLSearchParams();
      if (options.type) {
        params.set("type", options.type);
      }
      if (options.scale) {
        params.set("scale", String(options.scale));
      }
      const query = params.size > 0 ? `?${params.toString()}` : "";
      const hash = encodeURIComponent(JSON.stringify(payload));
      const port = process.env.PORT ?? 8080;
      const url = `http://127.0.0.1:${port}${RENDER_PAGE_ROUTE}${query}#${hash}`;
      await page.goto(url, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
      // Checked as a serialized expression: it runs in the browser context,
      // not in Node.
      await page.waitForFunction(
        `window.__renderResult !== undefined || document.title.startsWith("error:")`,
        { timeout: RENDER_TIMEOUT_MS, polling: 250 }
      );
      const failure = await page.title();
      if (failure.startsWith("error:")) {
        throw new Error(failure.slice("error:".length).trim());
      }
      return (await page.evaluate("window.__renderResult")) as RenderResult;
    } finally {
      await page.close().catch(() => undefined);
    }
  });

// In-page renderer: decodes the payload hash, renders with mermaid and
// publishes the SVG (or rasterized PNG) on window.__renderResult.
export const renderPageHtml = (): string => `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>rendering</title></head>
  <body>
    <script type="module">
      import mermaid from '${RENDER_ASSETS_ROUTE}/mermaid.esm.min.mjs';
      try {
        const payload = JSON.parse(decodeURIComponent(location.hash.slice(1)));
        const config =
          typeof payload.config === 'string'
            ? JSON.parse(payload.config || '{}')
            : (payload.config ?? {});
        mermaid.initialize({ startOnLoad: false, ...config });
        const { svg } = await mermaid.render('mermaid-vault-render', payload.code);
        const params = new URLSearchParams(location.search);
        if (params.get('type') === 'png') {
          const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
          const el = doc.documentElement;
          const viewBox = el.viewBox && el.viewBox.baseVal;
          const width =
            viewBox && viewBox.width > 0
              ? viewBox.width
              : parseFloat(el.getAttribute('width')) || 800;
          const height =
            viewBox && viewBox.height > 0
              ? viewBox.height
              : parseFloat(el.getAttribute('height')) || 600;
          const scale = Math.min(Math.max(Number(params.get('scale')) || 2, 1), 4);
          const image = new Image();
          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error('SVG rasterization failed'));
            image.src =
              'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          (window).__renderResult = { png: canvas.toDataURL('image/png') };
        } else {
          (window).__renderResult = { svg };
        }
      } catch (error) {
        document.title =
          'error: ' + ((error && error.message) || String(error)).slice(0, 500);
      }
    </script>
  </body>
</html>`;

export const mermaidDistPath = (): string =>
  path.join(path.dirname(require.resolve("mermaid/package.json")), "dist");
