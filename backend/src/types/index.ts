export interface Project {
  id: string;
  title: string;
  code: string;
  created_at: number;
  updated_at: number;
}

export interface CreateProjectDto {
  title: string;
  code: string;
}

export interface UpdateProjectDto {
  title?: string;
  code?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface HistoryEntry {
  id: string;
  project_id?: string | null;
  name: string;
  state: Record<string, unknown>;
  time: number;
  type: string;
  url?: string;
}

export interface CreateHistoryDto {
  id?: string;
  project_id?: string | null;
  projectId?: string | null;
  name: string;
  state: Record<string, unknown>;
  time?: number;
  type?: string;
}

export interface UpdateHistoryDto {
  name?: string;
  state?: Record<string, unknown>;
  project_id?: string | null;
  projectId?: string | null;
}

export type PreviewTheme = "light" | "dark";

export interface SavePreviewDto {
  theme: PreviewTheme;
  /** sha256 hex of the code the preview was rendered from */
  codeHash: string;
  svg: string;
}

export interface PreviewSvg {
  svg: string;
  hash: string;
}


