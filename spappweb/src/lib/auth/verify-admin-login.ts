import { createAnonClient } from "@/lib/supabase/anon";
import { USER_STATUS, type UserStatus } from "@/lib/auth/user-status";
import { getConfigErrorMessage } from "@/lib/supabase/env";

export type VerifiedAdminUser = {
  id: number;
  user: string;
  status: UserStatus;
};

function normalizeAdminUser(result: unknown): VerifiedAdminUser | null {
  if (result == null) return null;
  if (Array.isArray(result)) {
    if (result.length === 0) return null;
    const first = result[0] as Record<string, unknown>;
    return {
      id: Number(first.id),
      user: String(first.user),
      status: String(first.status) as UserStatus,
    };
  }
  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    if (Object.keys(obj).length === 0) return null;
    return {
      id: Number(obj.id),
      user: String(obj.user),
      status: String(obj.status) as UserStatus,
    };
  }
  return null;
}

export async function verifyAdminLogin(
  username: string,
  password: string,
): Promise<{ user: VerifiedAdminUser } | { error: string; status: number }> {
  if (!username || !password) {
    return { error: "Ingresa usuario y contraseña.", status: 400 };
  }

  const configError = getConfigErrorMessage();
  if (configError) {
    return { error: configError, status: 500 };
  }

  const anon = createAnonClient();
  const { data: loginResult, error: loginError } = await anon.rpc(
    "verify_admin_login",
    { p_user: username, p_password: password },
  );

  if (loginError) {
    console.error("[login] verify_admin_login:", loginError.message);
    return { error: "No se pudo conectar con el servidor.", status: 500 };
  }

  const user = normalizeAdminUser(loginResult);
  if (!user || user.status !== USER_STATUS.admin) {
    return {
      error:
        "Usuario o contraseña incorrectos, o la cuenta no es administrador.",
      status: 401,
    };
  }

  return { user };
}
