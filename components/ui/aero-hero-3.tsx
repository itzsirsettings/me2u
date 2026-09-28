import Link from "next/link";

export default function AeroHeroCta() {
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
            href="https://app.me2ulend.online/support"
            className="text-green underline decoration-green/30 transition-colors hover:text-lime hover:decoration-lime/50"
          >
            Our support team is here
          </Link>
          .
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="https://app.me2ulend.online/register"
            className="group inline-flex min-h-14 items-center gap-3 rounded-full bg-green px-7 py-3.5 font-medium text-navy transition-colors hover:bg-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2"
          >
            Create Free Account
            <svg
              aria-hidden="true"
              className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </Link>

          <Link
            href="https://app.me2ulend.online/support"
            className="inline-flex min-h-14 items-center rounded-full border border-[var(--color-border)] bg-card/80 px-8 text-base font-normal text-card-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Talk to Support
          </Link>
        </div>
      </div>
    </section>
  );
}
