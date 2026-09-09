/**
 * Shared configuration for the MCP server (both stdio and streamable-HTTP
 * transports). Values come from environment variables with sensible
 * same-host defaults.
 */
export interface McpConfig {
  /** Base URL of the vault REST API the MCP server proxies. */
  apiBaseUrl: string;
  /** Base URL of the frontend, used to build view/edit share links. */
  frontendBaseUrl: string;
}

export const DEFAULT_FRONTEND_BASE_URL = "http://localhost:8081";

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

/**
 * Resolves the MCP configuration from the environment.
 *
 * @param fallbackApiBaseUrl used when MERMAID_VAULT_URL is not set. The
 *   stdio entry point defaults to localhost:8080, while the in-process HTTP
 *   endpoint passes its own listening address.
 */
export const resolveMcpConfig = (fallbackApiBaseUrl: string): McpConfig => {
  const baseUrl = process.env.BASE_URL?.trim();
  const apiBaseUrl = process.env.MERMAID_VAULT_URL?.trim()
    ? stripTrailingSlash(process.env.MERMAID_VAULT_URL.trim())
    : baseUrl
      ? `${stripTrailingSlash(baseUrl)}/api`
      : stripTrailingSlash(fallbackApiBaseUrl);
  const frontendBaseUrl = process.env.MERMAID_VAULT_FRONTEND_URL?.trim()
    ? stripTrailingSlash(process.env.MERMAID_VAULT_FRONTEND_URL.trim())
    : baseUrl
      ? stripTrailingSlash(baseUrl)
      : DEFAULT_FRONTEND_BASE_URL;
  return { apiBaseUrl, frontendBaseUrl };
};
