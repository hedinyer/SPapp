import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { createAnonClient } from "@/lib/supabase/anon";
import { USER_STATUS } from "@/lib/auth/user-status";
import {
  defaultVisitadorSession,
  visitadorSessionOptions,
  type VisitadorSessionData,
} from "@/lib/auth/visitador-session";
import { getConfigErrorMessage } from "@/lib/supabase/env";

function normalizeVisitadorUser(
  result: unknown,
): {
  id: number;
  user: string;
  status: string;
  visitador_id: number;
} | null {
  if (result == null) return null;
  const row = Array.isArray(result)
    ? (result[0] as Record<string, unknown> | undefined)
    : (result as Record<string, unknown>);
  if (!row || Object.keys(row).length === 0) return null;

  const visitadorId = Number(row.visitador_id);
  if (!visitadorId) return null;

  return {
    id: Number(row.id),
    user: String(row.user),
    status: String(row.status),
    visitador_id: visitadorId,
  };
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
      "verify_visitador_login",
      { p_user: username, p_password: password },
    );

    if (loginError) {
      console.error("[visitador/login] verify_visitador_login:", loginError.message);
      return NextResponse.json(
        { error: "No se pudo conectar con el servidor." },
        { status: 500 },
      );
    }

    const user = normalizeVisitadorUser(loginResult);
    if (!user || user.status !== USER_STATUS.visitador) {
      return NextResponse.json(
        {
          error:
            "Usuario o contraseña incorrectos, o la cuenta no es de visitador.",
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });
    const session = await getIronSession<VisitadorSessionData>(
      request,
      response,
      visitadorSessionOptions,
    );
    session.userId = user.id;
    session.username = user.user;
    session.visitadorId = user.visitador_id;
    session.isLoggedIn = true;
    await session.save();

    return response;
  } catch (error) {
    console.error("[visitador/login] unexpected:", error);
    return NextResponse.json(
      { error: "Error inesperado al iniciar sesión." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const session = await getIronSession<VisitadorSessionData>(
    request,
    response,
    visitadorSessionOptions,
  );
  session.userId = defaultVisitadorSession.userId;
  session.username = defaultVisitadorSession.username;
  session.visitadorId = defaultVisitadorSession.visitadorId;
  session.isLoggedIn = false;
  await session.save();
  return response;
}
