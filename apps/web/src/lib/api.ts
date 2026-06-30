const API = import.meta.env.VITE_API_URL ?? '';

export interface EntryCard {
  id: string;
  researchId: string;
  researchSlug?: string | null;
  type: string;
  title: string;
  sourceUrl: string | null;
  excerpt: string | null;
  heroImage: string | null;
  author: string | null;
  publishedAt: string | null;
  status: string;
  createdAt: string;
  userComment?: string | null;
}

export interface Research {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  isPrivate?: boolean;
  locked?: boolean;
  createdAt: string;
  entryCount?: number;
  inboxCount?: number;
  topicCount?: number;
  editor?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
}

export interface Trail {
  id: string;
  name: string;
  description: string | null;
  isPrivate?: boolean;
  locked?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error ?? `Request failed: ${res.status}`, res.status, err);
  }
  return res.json();
}

export const api = {
  editorLogin: (password: string) =>
    request<{ ok: boolean; editor: boolean }>('/api/auth/editor-login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  editorLogout: () => request('/api/auth/editor-logout', { method: 'POST' }),
  isEditor: () => request<{ editor: boolean }>('/api/auth/editor'),
  unlockResearch: (slug: string, password: string) =>
    request<{ ok: boolean }>(`/api/auth/research-unlock/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  unlockTrail: (trailId: string, password: string) =>
    request<{ ok: boolean }>(`/api/auth/trail-unlock/${trailId}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  researches: () => request<Research[]>('/api/researches'),
  createResearch: (data: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    password?: string;
    seedTopics?: boolean;
    seedTrails?: boolean;
  }) => request<Research>('/api/researches', { method: 'POST', body: JSON.stringify(data) }),
  deleteResearch: (slug: string) =>
    request<{ ok: boolean; slug: string }>(`/api/researches/${slug}/delete`, { method: 'POST' }),
  research: (slug: string) => request<Research>(`/api/researches/${slug}`),
  topics: (slug: string) => request<Topic[]>(`/api/researches/${slug}/topics`),
  trails: (slug: string) => request<Trail[]>(`/api/researches/${slug}/trails`),
  createTrail: (
    slug: string,
    data: { name: string; description?: string; isPrivate?: boolean; password?: string }
  ) =>
    request<Trail>(`/api/researches/${slug}/trails`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  entries: (slug: string, params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<EntryCard[]>(`/api/researches/${slug}/entries${q ? `?${q}` : ''}`);
  },
  entry: (id: string) =>
    request<EntryCard & { fullTextMd: string | null; comments: { body: string }[]; researchSlug?: string }>(
      `/api/entries/${id}`
    ),
  capturePreview: (url: string) =>
    request<Record<string, unknown>>('/api/capture/preview', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  capture: (data: Record<string, unknown>) =>
    request<EntryCard>('/api/capture', { method: 'POST', body: JSON.stringify(data) }),
  importTxt: (slug: string, content: string) =>
    request<{ imported: number }>(`/api/researches/${slug}/import`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  bulkImport: (
    slug: string,
    payload: Record<string, unknown>
  ) =>
    request<{
      imported: number;
      skipped: number;
      entryIds: string[];
      topicsCreated: number;
      tagsCreated: number;
    }>(`/api/researches/${slug}/bulk-import`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  publishInbox: (id: string) => request<EntryCard>(`/api/inbox/${id}/publish`, { method: 'POST' }),
  search: (q: string, research?: string) => {
    const params = new URLSearchParams({ q });
    if (research) params.set('research', research);
    return request<EntryCard[]>(`/api/search?${params}`);
  },
  trailDetail: (slug: string, trailId: string) =>
    request<{ id: string; name: string; nodes: { entry?: EntryCard }[] }>(
      `/api/researches/${slug}/trails/${trailId}`
    ),
};
