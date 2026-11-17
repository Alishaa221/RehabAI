import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import RehabAIApp from "@/components/rehabai-app"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export default async function AdminPage() {
  const store = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/admin/sign-in")
  const { data: profile } = await supabase.from("profiles").select("id,full_name,role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "admin" || user.app_metadata?.role !== "admin") redirect("/admin/sign-in?unauthorized=1")

  const admin = createSupabaseAdminClient()
  const [{ data: profileRows }, { data: auditLogs }, { data: users }, { data: setting }] = await Promise.all([
    admin.from("profiles").select("id,full_name,role,created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("audit_logs").select("id,actor_id,target_user_id,action,previous_role,new_role,details,created_at").order("created_at", { ascending: false }).limit(100),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("platform_settings").select("value").eq("key", "patient_registration_enabled").maybeSingle(),
  ])
  const emails = new Map((users?.users ?? []).map((item) => [item.id, item.email ?? ""]))
  const managementData = {
    profiles: (profileRows ?? []).map((item) => ({ ...item, email: emails.get(item.id) ?? "" })),
    auditLogs: auditLogs ?? [],
    registrationEnabled: setting?.value !== false,
  }
  return <RehabAIApp account={{ name: profile.full_name || user.email?.split("@")[0] || "Administrator", email: user.email ?? "", role: "admin" }} patient={null} symptoms={[]} wearable={null} plans={[]} sessions={[]} clinicalRecords={[]} patients={[]} profiles={[]} managementData={managementData} />
}
