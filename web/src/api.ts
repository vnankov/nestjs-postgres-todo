import type { ExplainReport, HealthInfo, ResponseMeta, Todo, TodoFilter, TodoStatus } from './types';

interface Envelope<T> {
  data: T;
  meta: ResponseMeta;
}

interface ApiErrorBody {
  message?: string | string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    throw new Error('Cannot reach the API. Start it with npm run dev.');
  }

  const body = (await response.json().catch(() => null)) as (Envelope<T> & ApiErrorBody) | null;
  if (!response.ok) {
    const message = body?.message;
    const text = Array.isArray(message) ? message.join(' ') : message;
    throw new Error(text || `Request failed (${response.status})`);
  }
  if (!body || !('data' in body)) {
    throw new Error('The API returned an unexpected response.');
  }
  return body;
}

export async function listTodos(
  filter: TodoFilter,
): Promise<{ items: Todo[]; total: number; meta: ResponseMeta }> {
  const path = filter === 'all' ? '/api/todos' : `/api/todos?status=${filter}`;
  const body = await request<{ items: Todo[]; total: number }>(path);
  return { ...body.data, meta: body.meta };
}

export async function createTodo(input: { title: string; notes: string }): Promise<Todo> {
  const body = await request<Todo>('/api/todos', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      notes: input.notes,
    }),
  });
  return body.data;
}

export async function updateTodo(
  id: string,
  patch: { title?: string; notes?: string | null; status?: TodoStatus },
): Promise<Todo> {
  const body = await request<Todo>(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return body.data;
}

export async function removeTodo(id: string): Promise<void> {
  await request<{ id: string }>(`/api/todos/${id}`, { method: 'DELETE' });
}

export async function getHealth(): Promise<HealthInfo> {
  const body = await request<HealthInfo>('/api/health');
  return body.data;
}

export async function getPlan(): Promise<ExplainReport> {
  const body = await request<ExplainReport>('/api/todos/debug/plan');
  return body.data;
}

export async function seedSamples(): Promise<{ inserted: number; sampleCount: number }> {
  const body = await request<{ inserted: number; sampleCount: number }>('/api/todos/debug/seed', {
    method: 'POST',
  });
  return body.data;
}

export async function clearSamples(): Promise<{ deleted: number }> {
  const body = await request<{ deleted: number }>('/api/todos/debug/samples', {
    method: 'DELETE',
  });
  return body.data;
}
