"use client"

import { useState } from "react"
import { Activity, CircleUserRound, Settings2, ShieldCheck, Stethoscope } from "lucide-react"

type AdminProfile = { id: string; full_name: string; email: string; role: "patient" | "doctor" | "admin"; created_at: string }
type AuditLog = { id: string; actor_id: string | null; target_user_id: string | null; action: string; previous_role: string | null; new_role: string | null; details: Record<string, unknown>; created_at: string }

type AdminManagementProps = { initialProfiles: AdminProfile[]; initialAuditLogs: AuditLog[]; initialRegistrationEnabled: boolean }

export default function AdminManagement({ initialProfiles, initialAuditLogs, initialRegistrationEnabled }: AdminManagementProps) {
  const [profiles, setProfiles] = useState<AdminProfile[]>(initialProfiles)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs)
  const [registrationEnabled, setRegistrationEnabled] = useState(initialRegistrationEnabled)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Administrator data could not be loaded.")
      setProfiles(result.profiles ?? [])
      setAuditLogs(result.auditLogs ?? [])
      setRegistrationEnabled(result.settings?.patient_registration_enabled !== false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Administrator data could not be loaded.")
    } finally {
      setLoading(false)
    }
  }


  async function sendAction(body: Record<string, unknown>) {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "The administrator action could not be completed.")
      setMessage(result.message ?? "Changes saved.")
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The administrator action could not be completed.")
    } finally {
      setBusy(false)
    }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    await sendAction({ action: "invite", email: form.get("email"), fullName: form.get("fullName"), role: form.get("role") })
    formElement.reset()
  }

  return <>
    <section className="portal-grid" id="overview">
      <article className="portal-card"><div className="portal-card-title"><CircleUserRound size={18} /><h2>Registered accounts</h2></div><p className="portal-number">{profiles.length}</p><p className="portal-empty">Patients, clinicians, and administrators in the directory.</p></article>
      <article className="portal-card"><div className="portal-card-title"><Stethoscope size={18} /><h2>Clinicians</h2></div><p className="portal-number">{profiles.filter((profile) => profile.role === "doctor").length}</p><p className="portal-empty">Clinician access is granted through administrator-managed invitations and approvals.</p></article>
    </section>
    {message && <p className="portal-alert" role="status">{message}</p>}{error && <p className="portal-error" role="alert">{error}</p>}
    <section className="portal-card" id="clinicians"><div className="portal-card-title"><Stethoscope size={18} /><h2>Invite clinician or administrator</h2></div><p className="portal-empty">Invited users receive an email to establish their password. Privileged roles are assigned server-side and recorded in the audit log.</p><form className="portal-form admin-inline-form" onSubmit={invite}><label>Full name<input name="fullName" maxLength={100} required /></label><label>Email address<input name="email" type="email" required /></label><label>Account role<select name="role" defaultValue="doctor"><option value="doctor">Clinician</option><option value="admin">Administrator</option></select></label><button className="portal-primary" disabled={busy}>{busy ? "Sending…" : "Send secure invitation"}</button></form></section>
    <section className="portal-card" id="accounts"><div className="portal-card-title"><ShieldCheck size={18} /><h2>Account directory and roles</h2></div>{loading ? <p className="portal-empty">Loading authorized accounts…</p> : profiles.length ? <div className="portal-list">{profiles.map((profile) => <div className="portal-row admin-account-row" key={profile.id}><div><b>{profile.full_name || "Unnamed account"}</b><small>{profile.email} · {profile.id}</small></div><label className="admin-role-control"><span className="sr-only">Role for {profile.email || profile.full_name}</span><select value={profile.role} onChange={(event) => void sendAction({ action: "set-role", userId: profile.id, role: event.target.value })} disabled={busy}><option value="patient">Patient</option><option value="doctor">Clinician</option><option value="admin">Administrator</option></select></label></div>)}</div> : <p className="portal-empty">No accounts are available.</p>}</section>
    <section className="portal-card" id="settings"><div className="portal-card-title"><Settings2 size={18} /><h2>Platform settings</h2></div><label className="admin-setting"><span><b>Public patient registration</b><small>When disabled, new patient account creation is blocked. Existing accounts remain available.</small></span><input type="checkbox" checked={registrationEnabled} disabled={busy || loading} onChange={(event) => { const next = event.target.checked; setRegistrationEnabled(next); void sendAction({ action: "set-setting", key: "patient_registration_enabled", value: next }) }} /></label></section>
    <section className="portal-card" id="audit"><div className="portal-card-title"><Activity size={18} /><h2>Recent audit log</h2></div>{loading ? <p className="portal-empty">Loading audit events…</p> : auditLogs.length ? <div className="portal-list">{auditLogs.map((log) => <div className="portal-row" key={log.id}><div><b>{log.action.replaceAll("_", " ")}</b><small>{new Date(log.created_at).toLocaleString()} · actor {log.actor_id ?? "system"}</small></div><span>{log.previous_role ?? "—"} → {log.new_role ?? "—"} · target {log.target_user_id ?? "—"}</span></div>)}</div> : <p className="portal-empty">No administrator actions have been recorded.</p>}</section>
  </>
}
