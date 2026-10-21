export const API_BASE = import.meta.env.BACKEND_URL || "http://localhost:8000"

async function fetchTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 8000 // ms
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(id)
  }
}

export async function fetchRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
  backoff = 500 // ms
): Promise<Response> {
  try {
    const res = await fetchTimeout(url, options)
    // retry somente se for erro do servidor
    if (res.status >= 500 && retries > 0) {
      await new Promise((r) => setTimeout(r, backoff))
      return fetchRetry(url, options, retries - 1, backoff * 2)
    }
    return res
  } catch (err) {
    // tentar novamente se ocorreu algum erro e se for GET
    if (retries > 0 && (!options.method || options.method === "GET")) {
      await new Promise((r) => setTimeout(r, backoff))
      return fetchRetry(url, options, retries - 1, backoff * 2)
    }
    throw err
  }
}
