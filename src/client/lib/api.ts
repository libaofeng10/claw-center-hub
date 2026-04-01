const BASE_URL = '/api';

async function request<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Agents
export const fetchAgents = () => request<{ agents: Agent[] }>('/agents');
export const fetchAgent = (id: string) =>
  request<AgentDetail>(`/agents/${id}`);

// File browser
export const fetchFile = (agentId: string, dir: 'workspace' | 'agentDir', filePath: string) =>
  request<FileContent>(`/agents/${agentId}/file?dir=${dir}&path=${encodeURIComponent(filePath)}`);
export const saveFile = (agentId: string, dir: 'workspace' | 'agentDir', filePath: string, content: string) =>
  request<{ ok: boolean }>(`/agents/${agentId}/file?dir=${dir}&path=${encodeURIComponent(filePath)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
export const createFile = (agentId: string, dir: 'workspace' | 'agentDir', filePath: string, content: string) =>
  request<{ ok: boolean }>(`/agents/${agentId}/file?dir=${dir}&path=${encodeURIComponent(filePath)}`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
export const deleteFile = (agentId: string, dir: 'workspace' | 'agentDir', filePath: string) =>
  request<{ ok: boolean }>(`/agents/${agentId}/file?dir=${dir}&path=${encodeURIComponent(filePath)}`, {
    method: 'DELETE',
  });

// Legacy skill endpoints
export const fetchAgentSkills = (id: string) =>
  request<{ skills: Skill[] }>(`/agents/${id}/skills`);
export const createSkill = (id: string, name: string, content: string) =>
  request(`/agents/${id}/skills`, {
    method: 'POST',
    body: JSON.stringify({ name, content }),
  });
export const fetchAuthStatus = (id: string) =>
  request<{ authenticated: boolean; reason?: string; profiles?: unknown }>(`/agents/${id}/auth-status`);

// Gateway
export const fetchGatewayStatus = () =>
  request<GatewayStatus>('/gateway/status');
export const restartGateway = () =>
  request<{ ok: boolean; output: string; error: string }>('/gateway/restart', { method: 'POST' });

// Channels
export const fetchChannelsStatus = () =>
  request<ChannelsStatus>('/channels/status');

// Logs
export const fetchLogs = (params?: { source?: string; lines?: number; filter?: string; level?: string }) => {
  const searchParams = new URLSearchParams();
  if (params?.source) searchParams.set('source', params.source);
  if (params?.lines) searchParams.set('lines', String(params.lines));
  if (params?.filter) searchParams.set('filter', params.filter);
  if (params?.level) searchParams.set('level', params.level);
  const qs = searchParams.toString();
  return request<{ lines: string[]; source: string }>(`/logs${qs ? `?${qs}` : ''}`);
};

// Config
export const fetchConfig = () =>
  request<{ config: unknown; raw: unknown; path: string }>('/config');
export const updateConfig = (config: unknown) =>
  request<{ ok: boolean; message: string }>('/config', { method: 'PUT', body: JSON.stringify({ config }) });

// Catalog
export const fetchCatalog = () =>
  request<{ catalog: unknown; exists: boolean; path?: string }>('/catalog');
export const regenerateCatalog = () =>
  request<{ ok: boolean; output: string; error: string }>('/catalog/regenerate', { method: 'POST' });

// Types
export interface Agent {
  id: string;
  name?: string;
  workspace?: string;
  agentDir?: string;
  subagents?: unknown;
  tools?: {
    alsoAllow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  children?: FileEntry[];
}

export interface AgentDetail {
  agent: Agent;
  workspaceFiles: FileEntry[];
  agentDirFiles: FileEntry[];
  workspacePath: string | null;
  agentDirPath: string | null;
}

export interface FileContent {
  content?: string;
  name: string;
  path: string;
  sensitive?: boolean;
  binary?: boolean;
  size: number;
}

export interface Skill {
  name: string;
  content: string;
  path: string;
}

export interface GatewayStatus {
  cli: { output: string; error: string; exitCode: number };
  health: unknown;
  info: unknown;
  reachable: boolean;
}

export interface ChannelsStatus {
  probe: { output: string; error: string; exitCode: number };
  config: unknown;
}
