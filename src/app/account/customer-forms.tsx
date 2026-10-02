"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RegistrationResponse = {
  success: boolean;
  error?: string;
};

export function CustomerLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await signIn("customer", {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        redirect: false,
      });
      if (!result?.ok || result.error) {
        setError("Email or password was not recognized. Check your details and try again.");
        return;
      }
      router.replace("/account/orders");
      router.refresh();
    } catch {
      setError("Sign in failed. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="customer-login-email">
          Email
        </label>
        <Input
          autoComplete="email"
          id="customer-login-email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="customer-login-password">
          Password
        </label>
        <Input
          autoComplete="current-password"
          id="customer-login-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

export function CustomerSignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = (await response.json()) as RegistrationResponse;
      if (!response.ok || !result.success) {
        setError(result.error ?? "Account sign-up failed. Please try again.");
        return;
      }

      const login = await signIn("customer", {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        redirect: false,
      });
      if (!login?.ok || login.error) {
        router.replace("/account/login?created=1");
        router.refresh();
        return;
      }
      router.replace("/account/orders");
      router.refresh();
    } catch {
      setError("Account sign-up failed. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="customer-name">
          Full name
        </label>
        <Input
          autoComplete="name"
          id="customer-name"
          maxLength={120}
          minLength={2}
          name="name"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="customer-email">
          Email
        </label>
        <Input
          autoComplete="email"
          id="customer-email"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="customer-password">
          Password
        </label>
        <Input
          autoComplete="new-password"
          id="customer-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
        <p className="text-xs leading-5 text-hush">Use at least 12 characters.</p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
