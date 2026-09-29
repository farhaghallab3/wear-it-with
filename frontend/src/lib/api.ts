/** Client for our Django server. The YouCam key never reaches the browser. */

export interface TryOnConfig {
  tryon_enabled: boolean
  documented_units_per_preview: number
  session_limit: number
  session_remaining: number
  categories: string[]
}

export type TryOnState = 'running' | 'success' | 'error' | 'cleared'

export interface TryOn {
  id: string
  state: TryOnState
  category: string
  source: 'youcam_clothes_v4'
  error?: { code: string; message: string; hint?: string }
  notice?: string
}

export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'fetch', ...init.headers },
    })
  } catch {
    throw new ApiError('offline', "Couldn't reach the app server. Is it running?", 0)
  }
  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = body?.error
    throw new ApiError(error?.code ?? 'server', error?.message ?? `Server error (${response.status}).`, response.status)
  }
  return body as T
}

export const api = {
  config: () => call<TryOnConfig>('config'),
  create: (form: FormData) => call<TryOn>('tryons', { method: 'POST', body: form }),
  get: (id: string) => call<TryOn>(`tryons/${id}`),
  forget: (id: string) => call<void>(`tryons/${id}`, { method: 'DELETE' }),
  async image(id: string): Promise<Blob> {
    const response = await fetch(`/api/tryons/${id}/image`, { credentials: 'same-origin' })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new ApiError(body?.error?.code ?? 'server', body?.error?.message ?? 'Could not load the preview image.', response.status)
    }
    return response.blob()
  },
}
