import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSameOriginRequest } from "@/lib/security/origin"

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This request is not allowed." }, { status: 403 })
  if (!process.env.OWNER_EMAIL?.trim()) return NextResponse.json({ error: "Owner setup is not configured. Ask the platform administrator to set OWNER_EMAIL." }, { status: 503 })

  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !user.email_confirmed_at) return NextResponse.json({ error: "Sign in with the verified owner account before continuing." }, { status: 401 })
  if (user.email.toLowerCase() !== process.env.OWNER_EMAIL.trim().toLowerCase()) return NextResponse.json({ error: "This verified account is not authorized for initial owner setup." }, { status: 403 })

  const admin = createSupabaseAdminClient()
  const { error } = await admin.rpc("bootstrap_rehabai_owner", { p_user_id: user.id, p_owner_email: process.env.OWNER_EMAIL.trim() })
  if (error) {
    const message = error.message.toLowerCase().includes("administrator already exists")
      ? "Initial setup is closed because an administrator already exists."
      : error.message.toLowerCase().includes("verified")
        ? "Confirm your owner email before starting administrator setup."
        : "Owner setup could not be completed. Confirm OWNER_EMAIL and try again."
    return NextResponse.json({ error: message }, { status: 403 })
  }
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true, message: "Administrator created. Sign in using the secure administrator portal." })
}
