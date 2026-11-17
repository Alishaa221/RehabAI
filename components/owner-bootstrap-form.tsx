"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Flower2, ShieldCheck } from "lucide-react"

export default function OwnerBootstrapForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setSuccess("")
    const form = new FormData(event.currentTarget)
    try {
      const login = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sign in", portalRole: "patient", email: form.get("email"), password: form.get("password") }),
      })
      const loginResult = await login.json().catch(() => ({}))
      if (!login.ok) {
        setError(loginResult.error ?? "Unable to verify the owner account.")
        return
      }
      const response = await fetch("/api/owner/bootstrap", { method: "POST" })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error ?? "Owner setup could not be completed.")
        return
      }
      setSuccess(result.message ?? "Administrator created. Sign in to the admin portal.")
      router.refresh()
    } catch {
      setError("We couldn’t complete that request. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return <main className="portal-auth-page"><section className="portal-auth-card">
    <a className="portal-brand" href="/" aria-label="RehabAI home"><span className="portal-brand-mark"><Flower2 size={20} /></span>rehab<span>ai</span></a>
    <p className="portal-kicker">ONE-TIME OWNER BOOTSTRAP</p>
    <h1>Secure administrator setup</h1>
    <p className="portal-muted">Sign in with the verified email configured as OWNER_EMAIL. Setup is available only while no administrator exists, and the server validates your identity before granting access.</p>
    <form className="portal-form" onSubmit={submit}>
      <label>Owner email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} maxLength={128} required /></label>
      {error && <p className="portal-error" role="alert">{error}</p>}
      {success && <p className="portal-alert" role="status">{success}</p>}
      <button className="portal-primary" type="submit" disabled={busy}>{busy ? "Verifying owner…" : "Verify and create first administrator"}<ArrowRight size={16} /></button>
    </form>
    <p className="portal-privacy"><ShieldCheck size={14} />Passwords are verified through Supabase Auth and are never stored by RehabAI.</p>
    <div className="portal-auth-links"><a href="/admin/sign-in">Administrator sign in</a><a href="/">Patient portal</a></div>
  </section></main>
}
