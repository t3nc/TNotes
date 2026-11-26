export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  raw?: Uint8Array;
}

async function parseError(res: Response): Promise<ApiError> {
  const data = await res.json().catch(() => null);
  const code =
    data && typeof data === 'object' && data.error && typeof data.error.code === 'string'
      ? data.error.code
      : 'http_' + res.status;
  const message =
    data && typeof data === 'object' && data.error && typeof data.error.message === 'string'
      ? data.error.message
      : '请求失败（' + res.status + '）';
  return new ApiError(code, message, res.status);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(options?.headers ?? {}) };
  let payload: BodyInit | undefined;
  if (options?.raw) {
    payload = options.raw as unknown as BodyInit;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(path, { method, headers, body: payload, credentials: 'include' });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T,>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T,>(path: string) => request<T>('DELETE', path),
  postBinary: <T,>(path: string, raw: Uint8Array, headers: Record<string, string>) =>
    request<T>('POST', path, undefined, { raw, headers }),
};
