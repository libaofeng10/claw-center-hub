const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:18789';

interface GatewayResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function fetchGateway<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<GatewayResponse<T>> {
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Gateway unreachable' };
  }
}

export async function getGatewayHealth(): Promise<GatewayResponse> {
  return fetchGateway('/health');
}

export async function getGatewayInfo(): Promise<GatewayResponse> {
  return fetchGateway('/api/info');
}

export async function getGatewaySessions(): Promise<GatewayResponse> {
  return fetchGateway('/api/sessions');
}
