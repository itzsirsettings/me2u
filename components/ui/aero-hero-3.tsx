"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function AeroHeroCta() {
  const router = useRouter();

  return (
    <section className="relative flex min-h-[92vh] w-full items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 z-10 size-full" aria-hidden="true">
        <div className="landing-cta-grid grid h-full w-full grid-cols-12 divide-x">
          <div className="col-span-1" />
          <div className="col-span-3" />
          <div className="col-span-4" />
          <div className="col-span-3" />
          <div className="col-span-1" />
        </div>
      </div>

      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at 50% 118%, color-mix(in srgb, var(--green) 18%, transparent), transparent 70%), radial-gradient(ellipse 55% 45% at 88% -12%, color-mix(in srgb, var(--navy) 12%, transparent), transparent 65%)",
        }}
      />
      <div className="landing-cta-scrim absolute inset-0" aria-hidden="true" />
      <div className="landing-cta-accent absolute inset-0" aria-hidden="true" />

      <div className="relative z-20 mx-auto max-w-5xl px-6 text-center text-foreground">
        <h2 className="mx-auto max-w-4xl text-center font-display text-5xl font-medium leading-[1.04] tracking-tight text-foreground md:text-6xl lg:text-8xl">
          Join Thousands of Nigerians
          <br />
          Building Trust Together.
        </h2>

        <p className="mx-auto mb-10 mt-8 max-w-2xl text-center text-lg font-normal leading-relaxed text-muted-foreground md:text-xl">
          Create your free account, verify your identity, and start borrowing and lending at 0%
          interest — with no hidden fees. Need a hand?{" "}
          <Link
            href="/support"
            className="text-green hover:text-lime transition-colors underline decoration-green/30 hover:decoration-lime/50"
          >
            Our support team is here
          </Link>
          .
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            className="group mx-auto flex cursor-pointer items-center justify-center gap-0 rounded-full border-none bg-transparent px-0 py-5 font-normal shadow-none hover:bg-transparent"
            onClick={() => router.push("/register")}
          >
            <span className="rounded-full bg-green px-7 py-3.5 text-navy transition-colors duration-300 ease-out group-hover:bg-lime">
              Create Free Account
            </span>
            <div className="relative flex h-fit cursor-pointer items-center overflow-hidden rounded-full bg-green p-5 text-navy transition-colors duration-300 ease-out group-hover:bg-lime">
              <ArrowUpRight className="absolute size-5 -translate-x-1/2 transition-transform duration-300 ease-out group-hover:translate-x-10" />
              <ArrowUpRight className="absolute size-5 -translate-x-10 transition-transform duration-300 ease-out group-hover:-translate-x-1/2" />
            </div>
          </Button>

          <Button
            asChild
            variant="secondary"
            className="min-h-14 rounded-full border border-[var(--color-border)] bg-card/80 px-8 text-base font-normal text-card-foreground shadow-none backdrop-blur transition-colors hover:bg-card"
          >
            <Link href="/support">Talk to Support</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
