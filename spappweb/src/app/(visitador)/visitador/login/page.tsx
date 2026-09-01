import { redirect } from "next/navigation";
import { VisitadorLoginForm } from "@/components/visitador/visitador-login-form";
import {
  getVisitadorSession,
  hasVisitadorAccess,
} from "@/lib/auth/visitador-session";

export default async function VisitadorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const session = await getVisitadorSession();
  if (hasVisitadorAccess(session)) redirect("/visitador/mis-visitas");
  const { u } = await searchParams;
  return <VisitadorLoginForm defaultUsername={u?.trim() ?? ""} />;
}
