import Link from "next/link"
import { ArrowRight, Flower2, HeartPulse, ShieldCheck, Sparkles } from "lucide-react"

type PublicHomeProps = { authStatus?: "error" | "" }

export default function PublicHome({ authStatus = "" }: PublicHomeProps) {
  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#294640]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link className="portal-brand" href="/" aria-label="RehabAI home">
          <span className="portal-brand-mark"><Flower2 size={20} /></span>
          rehab<span>ai</span>
        </Link>
        <nav className="flex items-center gap-3" aria-label="Main navigation">
          <Link className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold text-[#4f7167] hover:bg-[#eaf2ed] sm:px-3" href="/login">Sign in</Link>
          <Link className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-[#397968] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2f6859] sm:px-4 sm:text-sm" href="/register">Create account<ArrowRight size={15} /></Link>
        </nav>
      </header>

      {authStatus === "error" && (
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="rounded-xl border border-[#e6c7c1] bg-[#fff8f6] px-4 py-3 text-sm text-[#8f4b42]" role="alert">We couldn’t confirm your email. Please try the link again or sign in to request a new confirmation.</p>
        </div>
      )}

      <section className="relative isolate overflow-hidden px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16">
        <div className="pointer-events-none absolute -right-24 top-10 -z-10 h-80 w-80 rounded-full bg-[#e0f0e8] blur-2xl" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce9e1] bg-white/80 px-4 py-2 text-[11px] font-bold tracking-[0.14em] text-[#587c6e]">
              <Sparkles size={14} /> CANCER REHABILITATION · PERSONALIZED YOGA
            </p>
            <h1 className="text-pretty text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#294640] sm:text-5xl lg:text-[3rem]">
              Your cancer rehabilitation journey, <span className="text-[#4d8977]">supported by AI and personalized yoga.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#617970] md:text-lg md:leading-8">
              Understand your recovery, keep track of daily health signals and explore yoga-based rehabilitation support between care visits.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#397968] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(57,121,104,0.18)] transition hover:bg-[#2f6859]" href="/register">Start Your Recovery Journey<ArrowRight size={16} /></Link>
              <a className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d7e4dc] bg-white px-5 py-3 text-sm font-semibold text-[#456a5e] transition hover:bg-[#f3f8f5]" href="#care-pillars">Explore Yoga Programs</a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs leading-5 text-[#74877f]"><ShieldCheck size={15} className="shrink-0 text-[#63927f]" />Patient registration is secure. Clinician and administrator access stays restricted.</p>
          </div>

          <aside className="relative mx-auto w-full max-w-[500px]" aria-label="RehabAI support pillars">
            <div className="absolute -left-7 top-10 h-20 w-20 rounded-[2rem] bg-[#dceee5]" aria-hidden="true" />
            <div className="absolute -bottom-7 right-2 h-28 w-28 rounded-full bg-[#e7edf6]" aria-hidden="true" />
            <div className="relative rounded-[2rem] border border-[#e1ebe4] bg-white p-6 shadow-[0_28px_80px_rgba(43,79,65,0.10)] sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-[#789087]">SUPPORT BETWEEN VISITS</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#294640]">A steadier next step</h2>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8f3ec] text-[#4f8977]"><HeartPulse size={23} /></span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#6a7f76]">A calm space to reflect on recovery and find clinician-reviewed yoga guidance suited to your care journey.</p>
              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-4 rounded-2xl bg-[#f5f9f6] p-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#548979] shadow-sm"><HeartPulse size={20} /></span>
                  <div><p className="text-sm font-semibold text-[#365b50]">Cancer recovery</p><p className="mt-1 text-xs text-[#788b82]">Check-ins and care-team context</p></div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl bg-[#f5f9f6] p-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#548979] shadow-sm"><Flower2 size={20} /></span>
                  <div><p className="text-sm font-semibold text-[#365b50]">Personalized yoga</p><p className="mt-1 text-xs text-[#788b82]">Guidance reviewed for your care</p></div>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-[#edf1ee] pt-5 text-xs leading-5 text-[#788b82]"><ShieldCheck size={17} className="shrink-0 text-[#64917f]" />Your clinician remains central to your rehabilitation decisions.</div>
            </div>
          </aside>
        </div>
      </section>

      <section id="care-pillars" className="border-y border-[#e6ede8] bg-white px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold tracking-[0.14em] text-[#6e9183]">TWO CONNECTED PILLARS</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#294640] sm:text-4xl">Recovery support that makes room for the whole person.</h2>
            <p className="mt-4 text-sm leading-6 text-[#6d8178]">RehabAI brings recovery check-ins and yoga-based rehabilitation together, with clinical oversight at the heart of care.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-[#e5ede7] bg-[#f7faf8] p-6 sm:p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5f1e9] text-[#4f8977]"><HeartPulse size={22} /></span>
              <h3 className="mt-5 text-xl font-semibold text-[#365b50]">Cancer rehabilitation</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6d8178]">Record how you are feeling, review your recovery history and keep relevant information connected to your care team.</p>
            </article>
            <article className="rounded-3xl border border-[#e5ede7] bg-[#f7faf8] p-6 sm:p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8edf6] text-[#5b7599]"><Flower2 size={22} /></span>
              <h3 className="mt-5 text-xl font-semibold text-[#365b50]">Yoga-based rehabilitation</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6d8178]">Explore supportive movement with plans that stay subject to clinician review and your individual care needs.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] bg-[#eaf3ed] p-7 sm:p-10 md:flex-row md:items-center">
          <div className="max-w-2xl"><p className="text-[11px] font-bold tracking-[0.14em] text-[#6e9183]">A SUPPORTIVE START</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#294640] sm:text-3xl">Your care journey, with a little more clarity.</h2><p className="mt-3 text-sm leading-6 text-[#62796f]">Create a patient account to access your private rehabilitation workspace.</p></div>
          <Link className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#397968] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f6859]" href="/register">Create a patient account<ArrowRight size={16} /></Link>
        </div>
      </section>

      <footer className="border-t border-[#e5ede7] bg-white px-5 py-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs leading-5 text-[#7b8d85] sm:flex-row sm:items-center sm:justify-between">
          <span>RehabAI supports your care journey; it is not an emergency service, diagnosis, or substitute for professional medical advice.</span>
          <Link className="font-semibold text-[#4f7f70] hover:underline" href="/login">Patient sign in</Link>
        </div>
      </footer>
    </main>
  )
}
