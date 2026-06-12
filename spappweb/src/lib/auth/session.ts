import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { isAdminStatus, type UserStatus } from "@/lib/auth/user-status";

export interface SessionData {
  userId?: number;
  username?: string;
  userStatus?: UserStatus;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "dev-only-secret-min-32-chars-long!!",
  cookieName: "spapp_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export function hasAdminAccess(session: SessionData): boolean {
  return (
    session.isLoggedIn === true &&
    session.userId != null &&
    isAdminStatus(session.userStatus)
  );
}

export async function requireAdminSession() {
  const session = await getSession();
  if (!hasAdminAccess(session)) {
    throw new Error("No autorizado");
  }
  return session;
}
