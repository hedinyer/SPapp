import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  hasAdminAccess,
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session";
import {
  hasVisitadorAccess,
  visitadorSessionOptions,
  type VisitadorSessionData,
} from "@/lib/auth/visitador-session";

const adminProtectedPrefixes = [
  "/inbox",
  "/clientes",
  "/crear-cliente",
  "/visitadores",
  "/catalogo",
  "/productos-credito",
  "/inventario",
  "/caja",
  "/venta",
  "/venta-contado",
  "/garaje",
  "/vendidas",
  "/historial-ventas",
  "/solicitudes",
];

const visitadorProtectedPrefixes = [
  "/visitador/mis-visitas",
  "/visitador/visitas",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const adminSession = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions,
  );
  const visitadorSession = await getIronSession<VisitadorSessionData>(
    request,
    response,
    visitadorSessionOptions,
  );

  const isAdminLoggedIn = hasAdminAccess(adminSession);
  const isVisitadorLoggedIn = hasVisitadorAccess(visitadorSession);

  const isAdminProtected = adminProtectedPrefixes.some((p) =>
    pathname.startsWith(p),
  );
  const isVisitadorProtected = visitadorProtectedPrefixes.some((p) =>
    pathname.startsWith(p),
  );

  if (pathname === "/login" && isAdminLoggedIn) {
    return NextResponse.redirect(new URL("/inbox", request.url));
  }

  if (pathname === "/visitador/login" && isVisitadorLoggedIn) {
    return NextResponse.redirect(
      new URL("/visitador/mis-visitas", request.url),
    );
  }

  if (pathname === "/hojadevida/login") {
    return NextResponse.redirect(new URL("/hojadevida", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAdminLoggedIn ? "/inbox" : "/login", request.url),
    );
  }

  if (isAdminProtected && !isAdminLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isVisitadorProtected && !isVisitadorLoggedIn) {
    return NextResponse.redirect(new URL("/visitador/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/inbox/:path*",
    "/clientes",
    "/clientes/:path*",
    "/crear-cliente",
    "/visitadores/:path*",
    "/catalogo/:path*",
    "/productos-credito/:path*",
    "/inventario/:path*",
    "/caja",
    "/caja/:path*",
    "/venta",
    "/venta/:path*",
    "/venta-contado",
    "/venta-contado/:path*",
    "/garaje",
    "/garaje/:path*",
    "/vendidas",
    "/vendidas/:path*",
    "/historial-ventas",
    "/historial-ventas/:path*",
    "/solicitudes/:path*",
    "/visitador/login",
    "/visitador/mis-visitas",
    "/visitador/mis-visitas/:path*",
    "/visitador/visitas/:path*",
    "/hojadevida/login",
  ],
};
