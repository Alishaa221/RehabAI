import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getRequestOrigin, isSameOriginRequest } from "@/lib/security/origin"

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This request is not allowed." }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || !["sign in", "create account", "sign out"].includes(body.mode)) return NextResponse.json({ error: "Invalid account request." }, { status: 400 })
  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  if (body.mode === "sign out") {
    const { error } = await supabase.auth.signOut()
    return error ? NextResponse.json({ error: "Unable to sign out. Please try again." }, { status: 500 }) : NextResponse.json({ ok: true })
  }
  if (!["patient", "doctor", "admin"].includes(body.portalRole)) return NextResponse.json({ error: "Choose a valid account workspace." }, { status: 400 })
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : ""
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) return NextResponse.json({ error: "Enter a valid email and a password between 8 and 128 characters." }, { status: 400 })
  if (body.mode === "create account" && (!fullName || fullName.length > 100)) return NextResponse.json({ error: "Enter your full name to create a patient account." }, { status: 400 })
  if (body.mode === "create account" && body.portalRole !== "patient") return NextResponse.json({ error: "Clinician and administrator accounts are not available through public registration. Request clinician access from your platform administrator." }, { status: 403 })
  if (body.mode === "create account") {
    try {
      const admin = createSupabaseAdminClient()
      const { data: setting, error: settingError } = await admin.from("platform_settings").select("value").eq("key", "patient_registration_enabled").maybeSingle()
      if (settingError) return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 })
      if (setting?.value === false) return NextResponse.json({ error: "Public patient registration is currently closed. Contact your care team for access." }, { status: 403 })
    } catch {
      return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 })
    }
  }
  let result
  try {
    result = body.mode === "create account"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? getRequestOrigin(request)}/auth/callback`, data: { full_name: fullName, role: "patient" } } })
      : await supabase.auth.signInWithPassword({ email, password })
  } catch (error) {
    console.error("[auth] Supabase authentication request threw", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "We couldn’t reach the authentication service. Please try again." }, { status: 503 })
  }
  if (result.error) {
    const authError = result.error as typeof result.error & { details?: unknown }
    const errorCode = authError.code ?? ""
    const message = authError.message.toLowerCase()
    console.error("[auth] Supabase authentication request failed", {
      code: errorCode || null,
      message: authError.message,
      details: authError.details ?? null,
      status: authError.status ?? null,
    })
    if (body.mode === "create account") {
      if (errorCode === "email_address_invalid") return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
      if (errorCode === "weak_password" || message.includes("password")) return NextResponse.json({ error: "Choose a stronger password that meets the account security requirements." }, { status: 400 })
      if (errorCode === "user_already_exists" || errorCode === "email_exists" || message.includes("already registered")) return NextResponse.json({ error: "An account may already exist for this email. Try signing in instead." }, { status: 409 })
      if (errorCode === "email_address_not_authorized" || errorCode === "email_not_authorized") return NextResponse.json({ error: "A confirmation email cannot be delivered to this address yet. Try again later or contact your platform administrator." }, { status: 400 })
    }
    if (errorCode === "email_not_confirmed" || message.includes("confirm") || message.includes("verification")) return NextResponse.json({ error: "Please confirm your email using the link we sent you." }, { status: 400 })
    if (errorCode === "over_email_send_rate_limit" || authError.status === 429 || message.includes("rate limit")) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 })
    if (errorCode === "invalid_credentials" || message.includes("credentials") || message.includes("user not found")) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 })
    return NextResponse.json({ error: "We couldn’t complete that request. Please try again." }, { status: authError.status && authError.status >= 500 ? 502 : 400 })
  }
  if (body.mode === "sign in" && result.data.user) {
    const signedInUser = result.data.user
    const authenticatedRole = signedInUser.app_metadata?.role === "admin"
      ? "admin"
      : signedInUser.app_metadata?.role === "doctor"
        ? "doctor"
        : "patient"
    if (authenticatedRole !== body.portalRole) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: "This account is not authorized for the selected workspace." }, { status: 403 })
    }
  }
  return NextResponse.json({ ok: true, needsEmailConfirmation: body.mode === "create account" && !result.data.session })
}
