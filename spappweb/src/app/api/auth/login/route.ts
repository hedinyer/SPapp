import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  USER_STATUS,
  type UserStatus,
} from "@/lib/auth/user-status";
import {
  defaultSession,
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session";
import { getConfigErrorMessage } from "@/lib/supabase/env";

function normalizeAdminUser(
  result: unknown,
): { id: number; user: string; status: UserStatus } | null {
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const username = body.username?.trim() ?? "";
    const password = body.password?.trim() ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Ingresa usuario y contraseña." },
        { status: 400 },
      );
    }

    const configError = getConfigErrorMessage();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 500 });
    }

    const anon = createAnonClient();
    const { data: loginResult, error: loginError } = await anon.rpc(
      "verify_admin_login",
      { p_user: username, p_password: password },
    );

    if (loginError) {
      console.error("[login] verify_admin_login:", loginError.message);
      return NextResponse.json(
        { error: "No se pudo conectar con el servidor." },
        { status: 500 },
      );
    }

    const user = normalizeAdminUser(loginResult);
    if (!user || user.status !== USER_STATUS.admin) {
      return NextResponse.json(
        {
          error:
            "Usuario o contraseña incorrectos, o la cuenta no es administrador.",
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions,
    );
    session.userId = user.id;
    session.username = user.user;
    session.userStatus = USER_STATUS.admin;
    session.isLoggedIn = true;
    await session.save();

    return response;
  } catch (error) {
    console.error("[login] unexpected:", error);
    return NextResponse.json(
      { error: "Error inesperado al iniciar sesión." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions,
  );
  session.userId = defaultSession.userId;
  session.username = defaultSession.username;
  session.userStatus = defaultSession.userStatus;
  session.isLoggedIn = false;
  await session.save();
  return response;
}
