export function getRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url)
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const host = forwardedHost || request.headers.get("host")
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const protocol = (forwardedProtocol || requestUrl.protocol.replace(/:$/, "")).toLowerCase()

  if (host && (protocol === "http" || protocol === "https")) {
    try {
      return new URL(`${protocol}://${host}`).origin
    } catch {
      return requestUrl.origin
    }
  }

  return requestUrl.origin
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return true

  try {
    const originUrl = new URL(origin)
    return originUrl.origin === origin && originUrl.origin === getRequestOrigin(request)
  } catch {
    return false
  }
}
