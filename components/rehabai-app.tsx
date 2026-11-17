"use client"

import { useState } from "react"
import { Activity, BookOpen, CheckCircle2, CircleUserRound, Flower2, HeartPulse, LogOut, ShieldCheck, Stethoscope, Watch } from "lucide-react"
import AuthPortal from "@/components/auth-portal"
import AdminManagement from "@/components/admin-management"

type Role = "patient" | "doctor" | "admin"
type Profile = { id: string; full_name: string; role: "patient" | "doctor" | "admin" }
type Patient = { id: string; user_id: string; assigned_doctor_id: string | null; diagnosis: string | null; diagnosis_confirmed: boolean; treatment_stage: string | null; diagnosis_date: string | null; limitations: string[]; emergency_contact: string | null; created_at: string; profile?: Profile | null }
type Symptom = { id: string; patient_id: string; fatigue: number; stress: number; pain: number | null; mood: string | null; notes: string | null; logged_at: string }
type Plan = { id: string; patient_id: string; created_by: string; status: string; activities: unknown; clinician_notes: string | null; approved_by: string | null; approved_at: string | null; created_at: string }
type ClinicalRecord = { id: string; patient_id: string; doctor_id: string; record_type: string; details: Record<string, unknown>; recorded_at: string }
type Session = { id: string; patient_id: string; activity_name: string; duration_minutes: number; completed: boolean; perceived_exertion: number | null; completed_at: string | null }
type Wearable = { provider: string; connection_status: string; consent_granted: boolean; steps: number | null; resting_heart_rate: number | null; sleep_hours: number | null; measured_at: string; is_simulated: boolean } | null

type Props = {
  account: { name: string; email: string; role: Role } | null
  patient: Patient | null
  symptoms: Symptom[]
  wearable: Wearable
  plans: Plan[]
  sessions: Session[]
  clinicalRecords: ClinicalRecord[]
  patients: Patient[]
  profiles: Profile[]
  managementData?: { profiles: Array<Profile & { email: string; created_at: string }>; auditLogs: Array<{ id: string; actor_id: string | null; target_user_id: string | null; action: string; previous_role: string | null; new_role: string | null; details: Record<string, unknown>; created_at: string }>; registrationEnabled: boolean }
}

const roleDetails: Record<Role, { title: string; summary: string }> = {
  patient: { title: "Your recovery, at your pace", summary: "Your private recovery workspace" },
  doctor: { title: "Clinical workspace", summary: "Patients assigned to your care" },
  admin: { title: "Administration", summary: "Account and platform overview" },
}

export default function RehabAIApp({ account, patient, symptoms, wearable, plans, sessions, clinicalRecords, patients, profiles, managementData }: Props) {
  const [notice, setNotice] = useState("")
  const [activePatient, setActivePatient] = useState<Patient | null>(null)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [fatigue, setFatigue] = useState(symptoms[0]?.fatigue ?? 0)
  const [stress, setStress] = useState(symptoms[0]?.stress ?? 0)

  async function saveCheckIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    const response = await fetch("/api/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fatigue, stress, notes: form.get("notes") }) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setNotice(result.error ?? "Your check-in could not be saved."); return }
    window.location.reload()
  }

  async function saveSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityName: form.get("activityName"), durationMinutes: Number(form.get("durationMinutes")), perceivedExertion: Number(form.get("perceivedExertion")) }) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setNotice(result.error ?? "The session could not be saved."); return }
    window.location.reload()
  }

  async function submitClinical(action: "note" | "plan", patientId: string, planId?: string, status?: "approved" | "rejected") {
    setSaving(true)
    const response = await fetch("/api/clinical", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, patientId, planId, notes: note, status }) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setNotice(result.error ?? "The clinical update could not be saved."); return }
    setNote("")
    setNoteFor(null)
    window.location.reload()
  }

  async function signOut() {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "sign out" }) })
    window.location.reload()
  }

  if (!account) return <AuthPortal />

  const role = roleDetails[account.role]
  const visiblePatients = account.role === "doctor" ? patients : patients
  const selected = activePatient ?? (account.role === "patient" ? patient : null)
  const selectedSymptoms = symptoms.filter(item => item.patient_id === selected?.id)
  const selectedPlans = plans.filter(item => item.patient_id === selected?.id)
  const selectedSessions = sessions.filter(item => item.patient_id === selected?.id)
  const selectedClinicalRecords = clinicalRecords.filter(item => item.patient_id === selected?.id)

  return <div className="portal-shell"><aside className="portal-sidebar"><a className="portal-brand" href="/" aria-label="RehabAI home"><span className="portal-brand-mark"><Flower2 size={20}/></span>rehab<span>ai</span></a><p className="portal-kicker">{account.role.toUpperCase()} WORKSPACE</p><div className="portal-user"><span>{account.name.slice(0, 1).toUpperCase()}</span><div><b>{account.name}</b><small>{account.email}</small></div></div><nav className="portal-nav" aria-label="Workspace"><a href="#overview" className="active"><Activity size={17}/>Overview</a>{account.role === "patient" && <><a href="#recovery"><HeartPulse size={17}/>Recovery</a><a href="#plans"><Flower2 size={17}/>Care plans</a><a href="#devices"><Watch size={17}/>Connected devices</a></>}{account.role === "doctor" && <a href="#patients"><Stethoscope size={17}/>Assigned patients</a>}{account.role === "admin" && <><a href="#accounts"><CircleUserRound size={17}/>Account directory</a><a href="#clinicians"><Stethoscope size={17}/>Clinicians</a><a href="#settings"><Activity size={17}/>Platform settings</a><a href="#audit"><ShieldCheck size={17}/>Audit log</a></>}</nav><div className="portal-sidebar-foot"><ShieldCheck size={16}/><span>RehabAI supports care. It does not replace clinical judgment.</span></div></aside><main className="portal-main"><header className="portal-header"><div><p className="portal-kicker">{role.summary}</p><h1>{role.title}</h1></div><button className="portal-signout" onClick={signOut}><LogOut size={16}/>Sign out</button></header>{notice && <p className="portal-alert" role="status">{notice}</p>}
    {account.role === "patient" && <>
      {!patient ? <section className="portal-card"><h2>Your patient profile is being prepared</h2><p>Your authenticated account is active, but no patient record is linked yet. Please contact your clinic. No sample patient information is shown here.</p></section> : <>
      <section className="portal-banner" id="overview"><div><span className="portal-kicker">PATIENT-REPORTED RECOVERY</span><h2>Welcome, {account.name.split(" ")[0]}</h2><p>Only information recorded for your account appears in this workspace.</p></div><button className="portal-primary" onClick={() => setCheckInOpen(!checkInOpen)}><HeartPulse size={16}/>Add a check-in</button></section>
      {checkInOpen && <form className="portal-card portal-form" onSubmit={saveCheckIn}><h2>Daily check-in</h2><label>Fatigue: {fatigue} / 10<input type="range" min="0" max="10" value={fatigue} onChange={event => setFatigue(Number(event.target.value))}/></label><label>Stress: {stress} / 10<input type="range" min="0" max="10" value={stress} onChange={event => setStress(Number(event.target.value))}/></label><label>Optional note<textarea name="notes" maxLength={1000} rows={3}/></label><button className="portal-primary" disabled={saving}>{saving ? "Saving…" : "Save check-in"}</button></form>}
      <button className="portal-secondary" onClick={() => setSessionOpen(!sessionOpen)}>{sessionOpen ? "Close session form" : "Log a completed activity"}</button>
      {sessionOpen && <form className="portal-card portal-form" onSubmit={saveSession}><h2>Record completed activity</h2><p className="portal-empty">Record only activity you have already completed. This log is not a prescription.</p><label>Activity name<input name="activityName" maxLength={120} required/></label><label>Duration in minutes<input name="durationMinutes" type="number" min="1" max="180" defaultValue="10" required/></label><label>Perceived effort: 0–10<input name="perceivedExertion" type="number" min="0" max="10" defaultValue="3" required/></label><button className="portal-primary" disabled={saving}>{saving ? "Saving…" : "Save session"}</button></form>}
      <section className="portal-grid" id="recovery"><article className="portal-card"><div className="portal-card-title"><HeartPulse size={18}/><h2>Recent check-ins</h2></div>{selectedSymptoms.length === 0 ? <p className="portal-empty">Your saved check-ins will appear here.</p> : <div className="portal-list">{selectedSymptoms.map(item => <div className="portal-row" key={item.id}><div><b>{new Date(item.logged_at).toLocaleDateString()}</b><small>{item.notes || "Patient-reported"}</small></div><span>Fatigue {item.fatigue}/10 · Stress {item.stress}/10{item.pain == null ? "" : ` · Pain ${item.pain}/10`}</span></div>)}</div>}</article><article className="portal-card" id="devices"><div className="portal-card-title"><Watch size={18}/><h2>Wearable data</h2></div>{wearable && wearable.consent_granted && !wearable.is_simulated ? <div className="portal-metrics"><div><small>Steps</small><b>{wearable.steps ?? "—"}</b></div><div><small>Resting heart rate</small><b>{wearable.resting_heart_rate ?? "—"}</b></div><div><small>Sleep</small><b>{wearable.sleep_hours ?? "—"} hrs</b></div></div> : <p className="portal-empty">No consented, verified wearable measurements are connected. Simulated or unconsented values are not displayed.</p>}</article></section>
      <section className="portal-card"><div className="portal-card-title"><Activity size={18}/><h2>Activity history</h2></div>{selectedSessions.length ? selectedSessions.map(item => <div className="portal-row" key={item.id}><div><b>{item.activity_name}</b><small>{item.completed_at ? new Date(item.completed_at).toLocaleDateString() : "Session date not recorded"}</small></div><span>{item.duration_minutes} minutes · effort {item.perceived_exertion ?? "not recorded"}/10</span></div>) : <p className="portal-empty">No activity sessions recorded.</p>}</section>
      <section className="portal-card" id="plans"><div className="portal-card-title"><BookOpen size={18}/><h2>Clinician-reviewed care plans</h2></div>{selectedPlans.length ? selectedPlans.map(plan => <article className="portal-plan" key={plan.id}><span className={`portal-status ${plan.status}`}>{plan.status.replaceAll("_", " ")}</span><p>{plan.clinician_notes || "No clinician note was added."}</p>{Array.isArray(plan.activities) && plan.activities.length > 0 ? <pre>{JSON.stringify(plan.activities, null, 2)}</pre> : <p>No activities recorded in this plan.</p>}</article>) : <p className="portal-empty">No care plans have been recorded for your account. A clinician must review any plan before practice.</p>}</section>
      <section className="portal-card"><h2>Clinical profile</h2><div className="portal-metrics"><div><small>Diagnosis</small><b>{patient.diagnosis || "Not recorded"}</b></div><div><small>Confirmation</small><b>{patient.diagnosis_confirmed ? "Confirmed by care team" : "Pending clinician confirmation"}</b></div><div><small>Treatment stage</small><b>{patient.treatment_stage || "Not recorded"}</b></div></div><p className="portal-empty">Diagnosis and treatment decisions belong to your clinician. RehabAI does not make or confirm diagnoses.</p><h3>Clinical notes</h3>{selectedClinicalRecords.length ? selectedClinicalRecords.map(record => <article className="portal-row" key={record.id}><div><b>{record.record_type.replaceAll("_", " ")}</b><small>{new Date(record.recorded_at).toLocaleDateString()}</small></div><span>{typeof record.details.content === "string" ? record.details.content : "Recorded by your care team"}</span></article>) : <p className="portal-empty">No clinical notes are available.</p>}</section>
      </>}
    </>}
    {account.role === "doctor" && <section className="portal-card" id="patients"><div className="portal-card-title"><Stethoscope size={18}/><h2>Patients assigned to you</h2></div>{visiblePatients.length ? <div className="portal-patient-grid">{visiblePatients.map(item => <button className="portal-patient" key={item.id} onClick={() => setActivePatient(item)}><b>{item.profile?.full_name || "Patient"}</b><span>{item.diagnosis || "Diagnosis not recorded"}</span><small>{item.diagnosis_confirmed ? "Clinician confirmed" : "Confirmation pending"} · {item.treatment_stage || "Stage not recorded"}</small></button>)}</div> : <p className="portal-empty">No assigned patients are visible to this account.</p>}{selected && selected.id !== patient?.id && <section className="portal-detail"><h3>{selected.profile?.full_name || "Patient record"}</h3><p>Diagnosis: {selected.diagnosis || "Not recorded"} · {selected.diagnosis_confirmed ? "Confirmed" : "Awaiting clinician confirmation"}</p><p>Limitations: {selected.limitations?.length ? selected.limitations.join(", ") : "None recorded"}</p><p>Diagnosis date: {selected.diagnosis_date || "Not recorded"} · Stage: {selected.treatment_stage || "Not recorded"}</p><h4>Patient-reported check-ins</h4>{selectedSymptoms.length ? selectedSymptoms.map(item => <p key={item.id}>{new Date(item.logged_at).toLocaleDateString()}: fatigue {item.fatigue}/10, stress {item.stress}/10{item.pain == null ? "" : `, pain ${item.pain}/10`}</p>) : <p>No check-ins recorded.</p>}<h4>Care plans</h4>{selectedPlans.length ? selectedPlans.map(plan => <p key={plan.id}><span className={`portal-status ${plan.status}`}>{plan.status}</span> {plan.clinician_notes || "No clinical note"}</p>) : <p>No care plans recorded.</p>}<h4>Completed sessions</h4>{selectedSessions.filter(session => session.completed).map(session => <p key={session.id}>{session.activity_name} · {session.duration_minutes} minutes · {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : "Completed"}</p>)}<h4>Clinical notes</h4>{selectedClinicalRecords.map(record => <p key={record.id}>{new Date(record.recorded_at).toLocaleDateString()} · {typeof record.details.content === "string" ? record.details.content : record.record_type}</p>)}<button className="portal-link" onClick={() => { setNoteFor(selected.id); setNote("") }}>Add a clinical note</button>{noteFor === selected.id && <form onSubmit={event => { event.preventDefault(); void submitClinical("note", selected.id) }} className="portal-form"><label>Clinical note<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={4000} rows={4} required/></label><button className="portal-primary" disabled={saving}>Save note</button></form>}</section>}</section>}
    {account.role === "admin" && <AdminManagement initialProfiles={managementData?.profiles ?? []} initialAuditLogs={managementData?.auditLogs ?? []} initialRegistrationEnabled={managementData?.registrationEnabled ?? true} />}
    {account.role === "doctor" && <section className="portal-card"><div className="portal-card-title"><CheckCircle2 size={18}/><h2>Pending plan reviews</h2></div>{plans.filter(plan => plan.status === "pending").map(plan => <article className="portal-plan" key={plan.id}><p>Plan for patient record {plan.patient_id.slice(0, 8)}</p><textarea aria-label="Clinician note" value={noteFor === plan.id ? note : plan.clinician_notes || ""} onChange={event => { setNoteFor(plan.id); setNote(event.target.value) }} maxLength={4000} rows={3}/><div className="portal-actions"><button className="portal-primary" disabled={saving} onClick={() => void submitClinical("plan", plan.patient_id, plan.id, "approved")}>Approve plan</button><button className="portal-secondary" disabled={saving} onClick={() => void submitClinical("plan", plan.patient_id, plan.id, "rejected")}>Request revision</button></div></article>)}{!plans.some(plan => plan.status === "pending") && <p className="portal-empty">No pending plans are available in your assigned patient records.</p>}</section>}
    <footer className="portal-footer"><ShieldCheck size={15}/> RehabAI supports your care journey; it is not an emergency service, diagnosis, or substitute for professional medical advice.</footer></main></div>
}
