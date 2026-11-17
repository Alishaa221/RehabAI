"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CircleUserRound, Flower2, ShieldCheck, Stethoscope } from "lucide-react"

type AuthPortalProps = { adminOnly?: boolean; initialMessage?: string; initialMode?: "sign in" | "create account" }
type PortalRole = "patient" | "doctor" | "admin"

export default function AuthPortal({ adminOnly = false, initialMessage = "", initialMode = "sign in" }: AuthPortalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<"sign in" | "create account">(adminOnly ? "sign in" : initialMode)
  const [role, setRole] = useState<PortalRole>(adminOnly ? "admin" : "patient")
  const [error, setError] = useState(initialMessage)
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === "create account" && role !== "patient") return
    setBusy(true)
    setError("")
    setNotice("")
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          portalRole: adminOnly ? "admin" : role,
          email: form.get("email"),
          password: form.get("password"),
          fullName: form.get("fullName"),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error ?? "Unable to complete sign in.")
      } else if (result.needsEmailConfirmation) {
        setNotice("Check your inbox to confirm your email, then sign in.")
      } else {
        router.replace(adminOnly || role === "admin" ? "/admin" : "/")
        router.refresh()
      }
    } catch {
      setError("We couldn’t complete that request. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const registering = mode === "create account" && !adminOnly

  return (
    <main className="portal-auth-page">
      <section className="portal-auth-card">
        <a className="portal-brand" href="/" aria-label="RehabAI home"><span className="portal-brand-mark"><Flower2 size={20} /></span>rehab<span>ai</span></a>
        <p className="portal-kicker">SECURE REHABILITATION WORKSPACE</p>
        <h1>{adminOnly ? "Administrator sign in" : mode === "sign in" ? "Welcome back" : "Create a patient account"}</h1>
        <p className="portal-muted">{adminOnly ? "Administrative access is restricted to authorized accounts." : registering ? "Create a secure patient account to access your care workspace." : "Sign in to access the workspace assigned to your verified account."}</p>
        {!adminOnly && mode === "sign in" && (
          <div className="portal-role-picker" role="group" aria-label="Choose your workspace">
            <button type="button" aria-pressed={role === "patient"} className={role === "patient" ? "selected" : ""} onClick={() => setRole("patient")}><CircleUserRound size={17} />Patient</button>
            <button type="button" aria-pressed={role === "doctor"} className={role === "doctor" ? "selected" : ""} onClick={() => setRole("doctor")}><Stethoscope size={17} />Clinician</button>
          </div>
        )}
        {registering && <div className="portal-alert" role="note"><b>Patient registration only.</b> Clinician access requires an administrator invitation or approval. Do not use public signup to request privileged access.</div>}
        <form className="portal-form" onSubmit={submit}>
          {registering && <label>Full name<input name="fullName" autoComplete="name" maxLength={100} required /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></label>
          {error && <p className="portal-error" role="alert">{error}</p>}
          {notice && <p className="portal-alert" role="status">{notice}</p>}
          <button className="portal-primary" type="submit" disabled={busy}>{busy ? "Please wait…" : adminOnly ? "Sign in to admin" : registering ? "Create Patient Account" : `Sign in to ${role === "doctor" ? "clinician" : "patient"} workspace`}<ArrowRight size={16} /></button>
        </form>
        {!adminOnly && <button className="portal-link" onClick={() => { setMode(registering ? "sign in" : "create account"); setRole("patient"); setError("") }}>{registering ? "Already registered? Sign in" : "New patient? Create an account"}</button>}
        <div className="portal-auth-links">
          {adminOnly ? <><a href="/admin/setup">First administrator? Secure owner setup</a><a href="/">Patient or clinician sign in</a></> : <a href="/admin/sign-in"><ShieldCheck size={14} /> Administrator sign in</a>}
        </div>
        {!adminOnly && <p className="portal-privacy"><ShieldCheck size={14} />Account roles are verified by the server, never by this form.</p>}
      </section>
    </main>
  )
}
