import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AuthPortal from "@/components/auth-portal"

export default async function AdminSignInPage({ searchParams }: { searchParams: Promise<{ unauthorized?: string }> }) {
  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const [{ data: { user } }, params] = await Promise.all([supabase.auth.getUser(), searchParams])
  if (user?.app_metadata?.role === "admin") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role === "admin") redirect("/admin")
  }
  return <AuthPortal adminOnly initialMessage={params.unauthorized ? "This account is not authorized for administrator access." : ""} />
}
