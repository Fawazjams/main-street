"use client";

import { useState } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * A login screen with no login behind it.
 *
 * Deliberately a prototype: it validates that both fields have something in
 * them, remembers the name for the next screen's greeting, and continues.
 * There is no account, no session, and no guard on the routes it leads to -
 * typing /app straight into the address bar works.
 *
 * TODO: replace with Supabase auth. That is the standing P0 in PROJECT.md, and
 * it is what lets the row-level policies stop being wide open and unblocks
 * tours and group invites. Everything fake lives in this file and in the
 * sessionStorage read on /start, so the swap is contained.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (email.trim() === "" || password.trim() === "") {
      setError("Enter an email and password to continue.");
      return;
    }
    // sessionStorage, not a cookie: nothing here is a credential, it is a
    // greeting, and it should not outlive the tab.
    sessionStorage.setItem("ms.email", email.trim());
    router.push("/start");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <header className="px-6 py-4 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-ink no-underline hover:text-ink"
        >
          <ArrowLeftIcon size={14} aria-hidden />
          Back
        </Link>
      </header>

      <div className="flex flex-1 items-start justify-center px-6 pt-14">
        <div className="w-full max-w-[380px] rounded-3xl border-2 border-green bg-panel px-8 pt-8 pb-9">
          <Image
            src="/art/logo-house.png"
            alt="Illustration of a house"
            width={874}
            height={285}
            priority
            className="mb-3 block h-auto w-full"
          />
          <p className="mb-2 text-center font-heading text-[17px] font-semibold">
            Main Street
          </p>
          <h1 className="mb-2 text-center font-heading text-2xl font-semibold">Log in</h1>
          <p className="mb-6 text-center text-[13px] leading-normal text-muted-ink">
            Any school email works. This is a prototype login.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-body"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="you@yourschool.edu"
                aria-invalid={error !== null}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold text-body"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                aria-invalid={error !== null}
              />
            </div>

            {error && <p className="mt-0.5 text-[13px] text-alert">{error}</p>}

            <Button type="submit" size="pill" className="mt-2.5 h-10 w-full uppercase">
              Log in
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-faint italic">
            Supabase auth isn&rsquo;t wired up yet. Any credentials continue.
          </p>
        </div>
      </div>
    </div>
  );
}
