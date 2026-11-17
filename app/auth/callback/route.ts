import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getRequestOrigin } from "@/lib/security/origin"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = getRequestOrigin(request)
  const code = url.searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/?auth=error", origin))
  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  return NextResponse.redirect(new URL(error ? "/?auth=error" : "/?auth=confirmed", origin))
}
