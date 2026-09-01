import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSession, hasAdminAccess } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();
  if (hasAdminAccess(session)) redirect("/inbox");
  return <LoginForm />;
}
