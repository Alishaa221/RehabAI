import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import RehabAIApp from "@/components/rehabai-app"
import PublicHome from "@/components/public-home"

export default async function Page({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const [{ data: { user } }, params] = await Promise.all([supabase.auth.getUser(), searchParams])
  if (!user) return <PublicHome authStatus={params.auth === "error" ? "error" : ""} />

  const { data: profile } = await supabase.from("profiles").select("id,full_name,role").eq("id", user.id).maybeSingle()
  if (user.app_metadata?.role === "admin") {
    if (profile?.role === "admin") redirect("/admin")
    redirect("/admin/sign-in?unauthorized=1")
  }
  const appRole = user.app_metadata?.role
  const role = appRole === "admin" ? "admin" : appRole === "doctor" ? "doctor" : "patient"
  const [{ data: ownPatient }, { data: scopedPatients }, { data: scopedProfiles }] = await Promise.all([
    supabase.from("patients").select("id,user_id,assigned_doctor_id,diagnosis,diagnosis_confirmed,treatment_stage,diagnosis_date,limitations,emergency_contact,created_at").eq("user_id", user.id).maybeSingle(),
    role === "patient"
      ? Promise.resolve({ data: [] })
      : supabase.from("patients").select("id,user_id,assigned_doctor_id,diagnosis,diagnosis_confirmed,treatment_stage,diagnosis_date,limitations,emergency_contact,created_at").order("created_at", { ascending: false }).limit(200),
    role === "admin"
      ? supabase.from("profiles").select("id,full_name,role").order("created_at", { ascending: false }).limit(500)
      : Promise.resolve({ data: [] }),
  ])
  const patients = (scopedPatients ?? []) as Array<Record<string, unknown>>
  const assignedUserIds = patients.map((item) => item.user_id).filter((id): id is string => typeof id === "string")
  const { data: assignedProfiles } = role === "doctor" && assignedUserIds.length
    ? await supabase.from("profiles").select("id,full_name,role").in("id", assignedUserIds)
    : { data: [] }
  const profileById = new Map((assignedProfiles ?? []).map((item) => [item.id, item]))
  const patientIds = [...new Set([ownPatient?.id, ...patients.map((item) => item.id)].filter((id): id is string => typeof id === "string"))]
  const [{ data: symptomRows }, { data: planRows }, { data: sessionRows }, { data: clinicalRows }, { data: wearableRow }] = await Promise.all([
    patientIds.length ? supabase.from("symptom_logs").select("id,patient_id,fatigue,stress,pain,mood,notes,logged_at").in("patient_id", patientIds).order("logged_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
    patientIds.length ? supabase.from("yoga_plans").select("id,patient_id,created_by,status,activities,clinician_notes,approved_by,approved_at,created_at").in("patient_id", patientIds).order("created_at", { ascending: false }).limit(300) : Promise.resolve({ data: [] }),
    patientIds.length ? supabase.from("yoga_sessions").select("id,patient_id,activity_name,duration_minutes,completed,perceived_exertion,completed_at").in("patient_id", patientIds).order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
    patientIds.length ? supabase.from("clinical_records").select("id,patient_id,doctor_id,record_type,details,recorded_at").in("patient_id", patientIds).order("recorded_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
    ownPatient ? supabase.from("wearable_data").select("provider,connection_status,consent_granted,steps,resting_heart_rate,sleep_hours,measured_at,is_simulated").eq("patient_id", ownPatient.id).order("measured_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const safePatients = patients.map((item) => ({
    ...item,
    profile: typeof item.user_id === "string" ? profileById.get(item.user_id) ?? null : null,
  })) as never[]
  const visibleProfiles = role === "doctor" ? (assignedProfiles ?? []) : (scopedProfiles ?? [])
  return <RehabAIApp
    account={{ name: profile?.full_name || user.email?.split("@")[0] || "Account", email: user.email ?? "", role }}
    patient={ownPatient as never}
    symptoms={(symptomRows ?? []) as never[]}
    wearable={wearableRow as never}
    plans={(planRows ?? []) as never[]}
    sessions={(sessionRows ?? []) as never[]}
    clinicalRecords={(clinicalRows ?? []) as never[]}
    patients={safePatients}
    profiles={visibleProfiles as never[]}
  />
}
