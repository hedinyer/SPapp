"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAdminAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full bg-black text-white hover:bg-neutral-800"
      size="lg"
      disabled={pending}
    >
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAdminAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <Card className="w-full max-w-md border-neutral-200 shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">SP Admin</CardTitle>
          <CardDescription>
            Ingresa con una cuenta administrador, no con cuentas de cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {state?.error ? (
              <p className="text-sm text-red-600" role="alert">
                {state.error}
              </p>
            ) : null}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
