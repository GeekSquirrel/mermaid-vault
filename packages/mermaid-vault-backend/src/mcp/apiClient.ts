import type {
  CreateDiagramDto,
  CreateWorkspaceDto,
  Diagram,
  HistoryEntry,
  PreviewTheme,
  UpdateDiagramDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceOrderDto,
  Workspace,
} from "../types/index.js";

/**
 * Error thrown for any failed vault API call. `code` mirrors the API error
 * codes (NOT_FOUND, INVALID_INPUT, RENDER_UNAVAILABLE, ...); status 0 marks
 * transport-level failures (backend unreachable).
 */
export class VaultApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "VaultApiError";
  }
}

export interface VaultApiClientOptions {
  /** Base URL of the vault REST API, without trailing slash. */
  baseUrl: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

const connectionError = (baseUrl: string, cause: unknown): VaultApiError =>
  new VaultApiError(
    0,
    "CONNECTION_ERROR",
    `Cannot reach the Mermaid Vault API at ${baseUrl} (${cause instanceof Error ? cause.message : String(cause)}). Make sure the backend is running (pnpm dev or docker compose up).`
  );

/**
 * Minimal typed HTTP client for the vault REST API. The MCP tools are thin
 * wrappers around these methods, so all error handling lives here.
 */
export class VaultApiClient {
  private readonly baseUrl: string;

  constructor({ baseUrl }: VaultApiClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  get apiBaseUrl(): string {
    return this.baseUrl;
  }

  /** Performs the request and maps failures to VaultApiError. */
  private async fetchWithErrors(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    init: RequestInit = {}
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { method, ...init });
    } catch (cause) {
      throw connectionError(this.baseUrl, cause);
    }
    if (!response.ok) {
      let code = "HTTP_ERROR";
      let message = `${response.status} ${response.statusText}`;
      try {
        const envelope = (await response.json()) as ApiResponseEnvelope<unknown>;
        if (envelope.error) {
          code = envelope.error.code;
          message = envelope.error.message;
        }
      } catch {
        // Non-JSON error body: keep the status line as the message.
      }
      throw new VaultApiError(response.status, code, message);
    }
    return response;
  }

  private async requestJson<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await this.fetchWithErrors(method, path, {
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const envelope = (await response.json()) as ApiResponseEnvelope<T>;
    if (!envelope.success || envelope.data === undefined) {
      throw new VaultApiError(
        response.status,
        "INVALID_RESPONSE",
        "API returned a malformed response envelope"
      );
    }
    return envelope.data;
  }

  private async requestText(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string
  ): Promise<string> {
    const response = await this.fetchWithErrors(method, path);
    return response.text();
  }

  // --- Diagrams ---

  listDiagrams(): Promise<Diagram[]> {
    return this.requestJson<Diagram[]>("GET", "/api/diagrams");
  }

  getDiagram(id: string): Promise<Diagram> {
    return this.requestJson<Diagram>(
      "GET",
      `/api/diagrams/${encodeURIComponent(id)}`
    );
  }

  createDiagram(dto: CreateDiagramDto): Promise<Diagram> {
    return this.requestJson<Diagram>("POST", "/api/diagrams", dto);
  }

  updateDiagram(id: string, dto: UpdateDiagramDto): Promise<Diagram> {
    return this.requestJson<Diagram>(
      "PUT",
      `/api/diagrams/${encodeURIComponent(id)}`,
      dto
    );
  }

  deleteDiagram(id: string): Promise<Diagram["id"]> {
    return this.requestJson<{ deleted: boolean }>(
      "DELETE",
      `/api/diagrams/${encodeURIComponent(id)}`
    ).then(() => id);
  }

  /** Returns the cached SVG preview rendered by the browser, if fresh. */
  getDiagramPreviewSvg(id: string, theme: PreviewTheme): Promise<string> {
    return this.requestText(
      "GET",
      `/api/diagrams/${encodeURIComponent(id)}/preview.svg?theme=${theme}`
    );
  }

  // --- Workspaces ---

  listWorkspaces(): Promise<Workspace[]> {
    return this.requestJson<Workspace[]>("GET", "/api/workspaces");
  }

  getWorkspace(id: string): Promise<Workspace> {
    return this.requestJson<Workspace>(
      "GET",
      `/api/workspaces/${encodeURIComponent(id)}`
    );
  }

  createWorkspace(dto: CreateWorkspaceDto): Promise<Workspace> {
    return this.requestJson<Workspace>("POST", "/api/workspaces", dto);
  }

  updateWorkspace(id: string, dto: UpdateWorkspaceDto): Promise<Workspace> {
    return this.requestJson<Workspace>(
      "PUT",
      `/api/workspaces/${encodeURIComponent(id)}`,
      dto
    );
  }

  updateWorkspaceOrder(dto: UpdateWorkspaceOrderDto): Promise<void> {
    return this.requestJson<{ updated: boolean }>(
      "PUT",
      "/api/workspaces/order",
      dto
    ).then(() => undefined);
  }

  deleteWorkspace(id: string): Promise<void> {
    return this.requestJson<{ deleted: boolean }>(
      "DELETE",
      `/api/workspaces/${encodeURIComponent(id)}`
    ).then(() => undefined);
  }

  // --- History ---

  listHistory(
    options: { type?: string; diagramId?: string } = {}
  ): Promise<HistoryEntry[]> {
    const params = new URLSearchParams();
    if (options.type !== undefined) {
      params.set("type", options.type);
    }
    if (options.diagramId !== undefined) {
      params.set("diagramId", options.diagramId);
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";
    return this.requestJson<HistoryEntry[]>("GET", `/api/history${query}`);
  }

  getHistory(id: string): Promise<HistoryEntry> {
    return this.requestJson<HistoryEntry>(
      "GET",
      `/api/history/${encodeURIComponent(id)}`
    );
  }

  // --- Rendering ---

  renderSvg(state: string): Promise<string> {
    return this.requestText("GET", `/api/render/svg/${encodeURIComponent(state)}`);
  }

  renderImage(
    state: string,
    options: { type?: "png" | "svg"; scale?: number } = {}
  ): Promise<{ contentType: string; base64: string }> {
    const params = new URLSearchParams();
    if (options.type) {
      params.set("type", options.type);
    }
    if (options.scale) {
      params.set("scale", String(options.scale));
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";
    return this.fetchWithErrors(
      "GET",
      `/api/render/img/${encodeURIComponent(state)}${query}`
    ).then(async (response) => ({
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      base64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    }));
  }
}
