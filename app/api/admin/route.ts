import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSameOriginRequest } from "@/lib/security/origin"

const roles = ["patient", "doctor", "admin"] as const

type Role = (typeof roles)[number]

function validRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role)
}

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This request is not allowed." }, { status: 403 })
  const store = await cookies()
  const session = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 })
  const admin = createSupabaseAdminClient()
  const { data: actor } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (actor?.role !== "admin" || user.app_metadata?.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 })

  const [{ data: profiles, error: profileError }, { data: auditLogs, error: auditError }, { data: users, error: usersError }, { data: setting, error: settingError }] = await Promise.all([
    admin.from("profiles").select("id,full_name,role,created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("audit_logs").select("id,actor_id,target_user_id,action,previous_role,new_role,details,created_at").order("created_at", { ascending: false }).limit(100),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("platform_settings").select("value").eq("key", "patient_registration_enabled").maybeSingle(),
  ])
  if (profileError || auditError || usersError || settingError) return NextResponse.json({ error: "Administrator data could not be loaded." }, { status: 500 })
  const emailById = new Map((users.users ?? []).map((item) => [item.id, item.email ?? ""]))
  return NextResponse.json({
    profiles: (profiles ?? []).map((profile) => ({ ...profile, email: emailById.get(profile.id) ?? "" })),
    auditLogs: auditLogs ?? [],
    settings: { patient_registration_enabled: setting?.value !== false },
  })
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This request is not allowed." }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || !["invite", "set-role", "set-setting"].includes(body.action)) return NextResponse.json({ error: "Choose a valid account action." }, { status: 400 })
  const store = await cookies()
  const session = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const { data: { user: actor } } = await session.auth.getUser()
  if (!actor) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 })
  const admin = createSupabaseAdminClient()
  const { data: actorProfile } = await admin.from("profiles").select("role").eq("id", actor.id).maybeSingle()
  if (actorProfile?.role !== "admin" || actor.app_metadata?.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 })

  if (body.action === "set-setting") {
    if (body.key !== "patient_registration_enabled" || typeof body.value !== "boolean") return NextResponse.json({ error: "Choose a valid platform setting." }, { status: 400 })
    const { data: previous } = await admin.from("platform_settings").select("value").eq("key", body.key).maybeSingle()
    const { error: settingError } = await admin.from("platform_settings").upsert({ key: body.key, value: body.value, updated_by: actor.id, updated_at: new Date().toISOString() })
    if (settingError) return NextResponse.json({ error: "The platform setting could not be saved." }, { status: 500 })
    const { error: auditError } = await admin.from("audit_logs").insert({ actor_id: actor.id, action: "settings_change", details: { key: body.key, previous_value: previous?.value ?? null, new_value: body.value } })
    if (auditError) return NextResponse.json({ error: "The setting was updated, but its audit record could not be written." }, { status: 500 })
    return NextResponse.json({ ok: true, message: "Platform setting updated." })
  }

  if (body.action === "invite") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 100) : ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !fullName || !validRole(body.role) || body.role === "patient") return NextResponse.json({ error: "Enter a name, valid email address, and clinician or administrator role." }, { status: 400 })
    const role = body.role
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } })
    if (error || !data.user) return NextResponse.json({ error: "The invitation could not be sent. Check whether this account already exists." }, { status: 400 })
    const invitedUser = data.user
    const { error: metadataError } = await admin.auth.admin.updateUserById(invitedUser.id, { app_metadata: { ...invitedUser.app_metadata, role } })
    const { error: profileError } = await admin.from("profiles").update({ full_name: fullName, role, updated_at: new Date().toISOString() }).eq("id", invitedUser.id)
    if (metadataError || profileError) return NextResponse.json({ error: "The invitation was sent, but role assignment needs administrator follow-up." }, { status: 500 })
    const { error: auditError } = await admin.from("audit_logs").insert({ actor_id: actor.id, target_user_id: invitedUser.id, action: "clinician_invite", previous_role: "patient", new_role: role, details: { invited_email: email } })
    if (auditError) return NextResponse.json({ error: "The invitation was sent, but its audit record could not be written." }, { status: 500 })
    return NextResponse.json({ ok: true, message: `Invitation sent to ${email}.` })
  }

  const userId = typeof body.userId === "string" ? body.userId : ""
  const nextRole = body.role
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) || !validRole(nextRole)) return NextResponse.json({ error: "Choose a valid account and role." }, { status: 400 })
  const { data: target, error: targetError } = await admin.from("profiles").select("id,role").eq("id", userId).maybeSingle()
  if (targetError || !target) return NextResponse.json({ error: "That account could not be found." }, { status: 404 })
  if (userId === actor.id && nextRole !== "admin") return NextResponse.json({ error: "Ask another administrator to change your own role." }, { status: 409 })
  if (target.role === "admin" && nextRole !== "admin") {
    const { count, error: countError } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin")
    if (countError) return NextResponse.json({ error: "Administrator roles could not be verified." }, { status: 500 })
    if ((count ?? 0) <= 1) return NextResponse.json({ error: "The last administrator cannot be removed." }, { status: 409 })
  }
  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(userId)
  if (authUserError || !authUser.user) return NextResponse.json({ error: "That account could not be found." }, { status: 404 })
  const previousRole = target.role as Role
  const { error: metadataError } = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...authUser.user.app_metadata, role: nextRole } })
  if (metadataError) return NextResponse.json({ error: "The account role could not be updated." }, { status: 500 })
  const { error: profileError } = await admin.from("profiles").update({ role: nextRole, updated_at: new Date().toISOString() }).eq("id", userId)
  if (profileError) return NextResponse.json({ error: "The account role could not be updated." }, { status: 500 })
  const { error: auditError } = await admin.from("audit_logs").insert({ actor_id: actor.id, target_user_id: userId, action: "role_change", previous_role: previousRole, new_role: nextRole, details: {} })
  if (auditError) return NextResponse.json({ error: "The role changed, but the audit record could not be written." }, { status: 500 })
  return NextResponse.json({ ok: true, message: "Account role updated." })
}
