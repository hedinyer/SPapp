export type UserStatus = "normal" | "admin";

export const USER_STATUS = {
  normal: "normal",
  admin: "admin",
} as const satisfies Record<string, UserStatus>;

export function isAdminStatus(status: string | null | undefined): status is "admin" {
  return status === USER_STATUS.admin;
}

export function adminAccessDeniedMessage(status: string | null | undefined): string {
  if (status === USER_STATUS.normal) {
    return "Esta cuenta es de cliente. Solo usuarios con status admin pueden entrar.";
  }
  return "No tienes permisos de administrador.";
}
