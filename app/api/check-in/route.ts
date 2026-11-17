import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || !Number.isInteger(body.fatigue) || body.fatigue < 0 || body.fatigue > 10 || !Number.isInteger(body.stress) || body.stress < 0 || body.stress > 10) {
    return NextResponse.json({ error: "Check-in values must be between 0 and 10." }, { status: 400 })
  }
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 1000)) return NextResponse.json({ error: "Notes must be 1,000 characters or fewer." }, { status: 400 })
  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Please sign in to save your check-in." }, { status: 401 })
  const { data: patient, error: patientError } = await supabase.from("patients").select("id").eq("user_id", user.id).single()
  if (patientError || !patient) return NextResponse.json({ error: "Your patient profile is not ready yet." }, { status: 404 })
  const { error } = await supabase.from("symptom_logs").insert({ patient_id: patient.id, fatigue: body.fatigue, stress: body.stress, notes: body.notes?.trim().slice(0, 1000) || null, source: "patient" })
  if (error) return NextResponse.json({ error: "Unable to save this check-in right now." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
