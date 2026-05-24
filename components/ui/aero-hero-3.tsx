"use client";

import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const ctaBackgroundImage =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1800&q=80";

export const Component = () => {
  const router = useRouter();

  return (
    <section className="relative flex min-h-[92vh] w-full items-center justify-center overflow-hidden bg-navy">
      <div className="absolute inset-0 z-10 size-full" aria-hidden="true">
        <div className="grid h-full w-full grid-cols-12 divide-x divide-snow/15">
          <div className="col-span-1" />
          <div className="col-span-3" />
          <div className="col-span-4" />
          <div className="col-span-3" />
          <div className="col-span-1" />
        </div>
      </div>

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ctaBackgroundImage})` }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-navy/72" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(34,197,94,0.24),transparent_34%),linear-gradient(180deg,rgba(8,19,32,0.12),rgba(8,19,32,0.88))]" />
      </div>

      <div className="relative z-20 mx-auto max-w-5xl px-6 text-center text-snow">
        <h2 className="mx-auto max-w-4xl text-center font-display text-5xl font-medium leading-[1.04] tracking-tight text-snow md:text-6xl lg:text-8xl">
          Build trust first.
          <br />
          Borrow at 0%.
        </h2>

        <p className="mx-auto mb-10 mt-8 max-w-2xl text-center text-lg font-normal leading-relaxed text-snow/82 md:text-xl">
          Start with a protected wallet, complete KYC, and unlock interest-free peer lending built for real communities.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            className="group mx-auto flex cursor-pointer items-center justify-center gap-0 rounded-full border-none bg-transparent px-0 py-5 font-normal shadow-none hover:bg-transparent"
            onClick={() => router.push("/register")}
          >
            <span className="rounded-full bg-lime px-7 py-3.5 text-navy duration-500 ease-in-out group-hover:bg-navy group-hover:text-lime group-hover:transition-colors">
              Create account
            </span>
            <div className="relative flex h-fit cursor-pointer items-center overflow-hidden rounded-full bg-lime p-5 text-navy duration-500 ease-in-out group-hover:bg-navy group-hover:text-lime group-hover:transition-colors">
              <ArrowUpRight className="absolute size-5 -translate-x-1/2 transition-all duration-500 ease-in-out group-hover:translate-x-10" />
              <ArrowUpRight className="absolute size-5 -translate-x-10 transition-all duration-500 ease-in-out group-hover:-translate-x-1/2" />
            </div>
          </Button>

          <Button
            className="min-h-14 rounded-full border border-snow/20 bg-snow/8 px-8 text-base font-normal text-snow shadow-none backdrop-blur transition-colors hover:bg-snow/14"
            onClick={() => router.push("/login")}
          >
            Sign in
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Component;
