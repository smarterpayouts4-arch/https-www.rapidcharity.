"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

type Props = {
  mode: "firebase" | "local" | "unconfigured";
  apiKey?: string;
  devPassword?: boolean;
};

export function AdminLogin({ mode, apiKey, devPassword = false }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError("");
    try {
      let idToken: string | undefined;
      if (mode === "firebase") {
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
          },
        );
        const data = (await response.json()) as { idToken?: string; error?: { message?: string } };
        if (!response.ok || !data.idToken) {
          throw new Error(data.error?.message?.replaceAll("_", " ") || "Firebase sign-in failed");
        }
        idToken = data.idToken;
      }
      const session = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(idToken ? { idToken } : { password }),
      });
      const body = (await session.json()) as { error?: string };
      if (!session.ok) throw new Error(body.error || "Sign-in failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.loginShell}>
        <p className={styles.loginEyebrow}>RAPID Charity</p>
        <h1 className={styles.loginTitle}>Editor sign in</h1>
        {mode === "unconfigured" ? (
          <p className={styles.loginLead}>
            Admin is locked. Set Firebase Auth (<code>NEXT_PUBLIC_FIREBASE_API_KEY</code>,{" "}
            <code>FIREBASE_PROJECT_ID</code>, <code>ADMIN_EMAILS</code>) or, for local development only,{" "}
            <code>ADMIN_LOCAL_PASSWORD</code>.
          </p>
        ) : (
          <form className={styles.loginForm} onSubmit={(event) => void onSubmit(event)}>
            <p className={styles.loginLead}>
              {mode === "firebase"
                ? "Use the Firebase account listed in ADMIN_EMAILS."
                : devPassword
                  ? "Local development password. No Firebase credentials are set, so this server accepts rapid-local. Sign-in switches to Firebase once those keys are added."
                  : "Local development password. This sign-in is disabled once Firebase Auth is configured."}
            </p>
            {mode === "firebase" ? (
              <label className={styles.field}>
                Email
                <input name="email" type="email" autoComplete="username" required />
              </label>
            ) : null}
            <label className={styles.field}>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {error ? (
              <p className={styles.statusErr} role="alert">
                {error}
              </p>
            ) : null}
            <button className={styles.btn} type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
