import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || !["note", "plan"].includes(body.action) || typeof body.patientId !== "string" || (body.action === "plan" && !["approved", "rejected"].includes(body.status))) return NextResponse.json({ error: "Invalid clinical request." }, { status: 400 })
  if (typeof body.notes !== "string" || body.notes.length > 4000) return NextResponse.json({ error: "Clinical notes must be 4,000 characters or fewer." }, { status: 400 })
  
  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  
  const isDoctor = user.app_metadata?.role === "doctor"
  const isAdmin = user.app_metadata?.role === "admin"
  if (!isDoctor && !isAdmin) return NextResponse.json({ error: "Only authorized clinical staff can make clinical updates." }, { status: 403 })
  
  const { data: patient, error: patientError } = await supabase.from("patients").select("id,assigned_doctor_id").eq("id", body.patientId).maybeSingle()
  if (patientError || !patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 })
  if (!isAdmin && (!isDoctor || patient.assigned_doctor_id !== user.id)) return NextResponse.json({ error: "You cannot access this patient record." }, { status: 403 })
  
  if (body.action === "note") {
    const { error } = await supabase.from("clinical_records").insert({ patient_id: body.patientId, doctor_id: user.id, record_type: "note", details: { content: body.notes.trim().slice(0, 4000) } })
    if (error) return NextResponse.json({ error: "Clinical note could not be saved." }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  
  if (body.action === "plan") {
    if (typeof body.planId !== "string") return NextResponse.json({ error: "Plan ID is required." }, { status: 400 })
    const { data: plan, error: planError } = await supabase.from("yoga_plans").select("id,status,patient_id").eq("id", body.planId).maybeSingle()
    if (planError || !plan || plan.patient_id !== body.patientId) return NextResponse.json({ error: "Plan not found." }, { status: 404 })
    const approved = body.status === "approved"
    const { error } = await supabase.from("yoga_plans").update({ status: body.status, clinician_notes: body.notes.trim().slice(0, 4000), approved_by: approved ? user.id : null, approved_at: approved ? new Date().toISOString() : null }).eq("id", plan.id)
    if (error) return NextResponse.json({ error: "Plan update failed." }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  
  return NextResponse.json({ error: "Invalid action." }, { status: 400 })
}
