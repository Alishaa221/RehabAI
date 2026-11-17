import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const tasks = new Set(["fatigue", "stress", "recovery"])
const features = new Set(["age", "months_since_diagnosis", "day_number", "steps", "resting_heart_rate_bpm", "avg_heart_rate_bpm", "max_heart_rate_bpm", "hrv_rmssd_ms", "lf_power", "hf_power", "lf_hf_ratio", "bvp", "eda", "skin_temperature_c", "sleep_hours", "sleep_quality_score_0_10", "acc_x", "acc_y", "acc_z", "yoga_duration_min", "environment_temperature_c", "gender", "cancer_type", "treatment_stage", "did_yoga_session", "yoga_type_practiced"])

export async function POST(request: Request, { params }: { params: Promise<{ task: string }> }) {
  const { task } = await params
  if (task !== "all" && !tasks.has(task)) return NextResponse.json({ error: "Unknown prediction task." }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.patientId !== "string" || typeof body.features !== "object" || body.features === null || Array.isArray(body.features) || Object.keys(body.features).length !== features.size || Object.keys(body.features).some((key) => !features.has(key))) {
    return NextResponse.json({ error: "A valid patient ID and complete, leakage-excluded feature set are required." }, { status: 400 })
  }
  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  const { data: patient } = await supabase.from("patients").select("id,user_id,assigned_doctor_id").eq("id", body.patientId).maybeSingle()
  const isAdmin = user.app_metadata?.role === "admin"
  if (!patient || (patient.user_id !== user.id && patient.assigned_doctor_id !== user.id && !isAdmin)) {
    return NextResponse.json({ error: "Patient record not found." }, { status: 404 })
  }
  const baseUrl = process.env.REHABAI_INFERENCE_URL?.replace(/\/$/, "")
  const token = process.env.REHABAI_INFERENCE_API_TOKEN
  if (!baseUrl || !token) return NextResponse.json({ error: "Research inference is not configured: original trained model files and a secured inference-service connection are required." }, { status: 503 })
  const path = task === "all" ? "/predict/all" : `/predict/${task}`
  try {
    const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-RehabAI-Service-Token": token }, body: JSON.stringify({ features: body.features }), cache: "no-store", signal: AbortSignal.timeout(10_000) })
    const result = await response.json().catch(() => null)
    if (!response.ok) return NextResponse.json({ error: response.status === 503 ? "The original trained model artifact is unavailable; no prediction was generated." : "Research inference request failed." }, { status: response.status })
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Research inference service is unavailable." }, { status: 503 })
  }
}
