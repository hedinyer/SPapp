import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  defaultSession,
  hasAdminAccess,
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session";

const protectedPrefixes = [
  "/inbox",
  "/clientes",
  "/visitadores",
  "/catalogo",
  "/inventario",
  "/solicitudes",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions,
  );

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isLoggedIn = hasAdminAccess(session);

  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/inbox", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/inbox" : "/login", request.url),
    );
  }

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/inbox/:path*",
    "/clientes/:path*",
    "/visitadores/:path*",
    "/catalogo/:path*",
    "/inventario/:path*",
    "/solicitudes/:path*",
  ],
};
