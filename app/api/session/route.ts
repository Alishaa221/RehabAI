import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.activityName !== "string" || body.activityName.trim().length < 2 || body.activityName.length > 120 || !Number.isInteger(body.durationMinutes) || body.durationMinutes < 1 || body.durationMinutes > 180 || !Number.isInteger(body.perceivedExertion) || body.perceivedExertion < 0 || body.perceivedExertion > 10) return NextResponse.json({ error: "Enter an activity, a duration from 1 to 180 minutes, and effort from 0 to 10." }, { status: 400 })

  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Please sign in to record a session." }, { status: 401 })
  const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle()
  if (!patient) return NextResponse.json({ error: "Patient profile not found." }, { status: 404 })
  const { error } = await supabase.from("yoga_sessions").insert({ patient_id: patient.id, activity_name: body.activityName.trim(), duration_minutes: body.durationMinutes, perceived_exertion: body.perceivedExertion, completed: true, completed_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: "The session could not be saved." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
