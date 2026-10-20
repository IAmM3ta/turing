import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { authClient, authEnabled, signIn, GROK_PROVIDERS } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"up" | "in">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  const submit = async () => {
    setError("");
    if (!email.includes("@") || password.length < 8) {
      setError("Use a real email and at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({
              email: email.trim(),
              password,
              name: name.trim() || email.trim().split("@")[0] || "Maker",
              callbackURL: "/",
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
              callbackURL: "/",
            });
      if (result.error) {
        setError(result.error.message || "That didn’t work.");
        setPending(false);
        return;
      }
      await router.invalidate();
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn’t work.");
      setPending(false);
    }
  };

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-3">
          <span className="size-3 rounded-sm bg-brass" aria-hidden />
          <span className="text-[1.6rem] leading-none tracking-[0.14em]" style={{ fontFamily: '"Orbitron", sans-serif' }}>
            TURiNG
          </span>
        </Link>
        <h1 className="text-4xl leading-tight">Keep the pieces you print.</h1>
        <p className="mt-3 text-pretty text-muted">
          Pendants, earrings, cuff bands, signets. Save a pattern to your account and open it the next time you stand at the printer.
        </p>

        {isPending ? <div className="mt-8 h-40 animate-pulse rounded-lg bg-surface" /> : null}

        {!isPending && user ? (
          <div className="mt-8 grid gap-4">
            <p className="text-sm text-muted">You’re signed in. Saved pieces live on the mill.</p>
            <UserButton />
            <Link
              to="/"
              className="flex h-11 items-center justify-center rounded-md bg-brass text-sm font-medium text-bg"
            >
              Back to the mill
            </Link>
          </div>
        ) : null}

        {!isPending && !user ? (
          <div className="mt-8 grid gap-4">
            {authEnabled ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button tone={mode === "up" ? "solid" : "line"} onClick={() => setMode("up")}>
                    Create account
                  </Button>
                  <Button tone={mode === "in" ? "solid" : "line"} onClick={() => setMode("in")}>
                    Sign in
                  </Button>
                </div>
                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  {mode === "up" ? (
                    <Field label="Name" value={name} autoComplete="name" onChange={setName} />
                  ) : null}
                  <Field label="Email" value={email} type="email" autoComplete="email" onChange={setEmail} />
                  <Field
                    label="Password"
                    value={password}
                    type="password"
                    autoComplete={mode === "up" ? "new-password" : "current-password"}
                    onChange={setPassword}
                  />
                  <p className="text-sm text-muted">At least 8 characters. The mill still prints without an account.</p>
                  {error ? <p className="text-sm text-brass">{error}</p> : null}
                  <Button tone="solid" type="submit" disabled={pending}>
                    {pending ? "One moment" : mode === "up" ? "Create account" : "Sign in"}
                  </Button>
                </form>
                <div className="grid gap-2">
                  {GROK_PROVIDERS.map((provider) => (
                    <Button key={provider.providerId} onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}>
                      Continue with {provider.label}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Sign-in is turned off.</p>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-1 text-sm text-muted">
      {label}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-line bg-surface px-3 text-sm text-fg"
      />
    </label>
  );
}
