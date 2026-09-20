"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import Me2uIcon from "@/components/Me2uIcon";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggleIcon from "@/components/ThemeToggleIcon";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import { useStore } from "@/lib/store";
import { getCountryConfig, getCreditLevel, getReferralProgramProgress } from "@/lib/product-features";

export default function Profile() {
  const user = useStore((s) => s.user); const authenticated = useStore((s) => s.isAuthenticated); const loading = useStore((s) => s.isLoading); const logout = useStore((s) => s.logout); const router = useRouter(); const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); useEffect(() => { if (mounted && !loading && !authenticated) router.push("/login"); }, [authenticated, loading, mounted, router]);
  if (!mounted || (!authenticated && !loading)) return null;
  const level = getCreditLevel(user?.trustScore || 0); const country = getCountryConfig(user?.countryCode); const referral = getReferralProgramProgress(user); const initials = (user?.name || "Me2U User").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const rows = [
    { label: "Email", value: user?.email || "No email", detail: undefined, icon: "email" as const, path: "/security" },
    { label: "KYC Status", value: user?.kycVerified ? "Approved" : "Pending", detail: user?.kycVerified ? "Your identity has been verified." : "Complete your KYC to unlock full features.", icon: user?.kycVerified ? "check" as const : "shield" as const, path: "/kyc" },
    { label: "Bank Details", value: user?.bankName ? `${user.bankName} · ${user.accountNumber || "No account number"}` : "Not added · No account number", detail: "Add your bank account to receive payments.", icon: "bank" as const, path: "/wallet" },
  ];
  return <main className="reference-page app-mobile-screen mx-auto w-full max-w-md overflow-x-hidden px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] md:max-w-5xl md:px-8 md:py-12">
    <header className="mb-6 flex items-start justify-between"><BrandLogo src="/me2u_nav_logo.svg" className="reference-logo" /><div className="flex gap-2"><ThemeToggleIcon className="mobile-icon-button h-11 w-11 rounded-full border border-white bg-white text-slate-950 shadow-sm" /><NotificationBell /></div></header>
    <section className="mb-5"><h1 className="text-4xl font-black text-slate-950">Profile</h1><p className="mt-1 text-lg text-slate-500">Manage your account and preferences</p></section>
    <section className="reference-hero mb-5 flex min-h-[12.8rem] items-center gap-5 p-6"><div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[10px] border-white/50 bg-emerald-50 text-4xl font-black text-emerald-700">{initials}</div><div className="min-w-0 flex-1"><h2 className="truncate text-3xl font-black">{user?.name || "Me2U Member"}</h2><p className="mt-1 text-xl text-white/90">Good to see you again!</p></div><button type="button" onClick={() => router.push("/security")} className="hidden shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-emerald-700 hover:bg-emerald-50 sm:flex"><Me2uIcon name="edit" size={20} /> Edit Profile</button></section>
    <section className="reference-card mb-5 grid grid-cols-3 divide-x divide-slate-100 p-5"><Metric title="Trust Level" value={`${level.name} · ${user?.trustScore || 0}`} detail="Complete more steps to unlock higher benefits." icon="star" /><Metric title="Country" value={`${country.name} · ${country.currency}`} detail="Your location and currency." icon="globe" /><Metric title="Referral Level" value={`${referral.currentLevel?.name || "Starter"} · ${referral.verifiedReferralCount} verified`} detail="Refer friends and earn rewards." icon="referral" /></section>
    <section className="reference-card mb-5 px-5">{rows.map((row) => <button key={row.label} onClick={() => router.push(row.path)} className="reference-row w-full text-left"><span className="reference-icon rounded-2xl"><Me2uIcon name={row.icon} size={24} /></span><span className="min-w-0"><small className="block font-bold uppercase tracking-[.08em] text-slate-500">{row.label}</small><b className="block truncate text-lg text-slate-950">{row.value}</b>{row.detail && <small className="block truncate text-sm text-slate-500">{row.detail}</small>}</span><span className="reference-chevron text-3xl">›</span></button>)}</section>
    <section className="reference-card mb-5 p-5"><ThemeModeSelector /></section>
    <div className="grid gap-3"><button onClick={() => router.push("/security")} className="min-h-14 rounded-full bg-gradient-to-r from-emerald-600 to-green-400 px-5 font-bold text-white shadow-lg shadow-emerald-200 hover:brightness-105"><Me2uIcon name="shield" size={20} className="mr-2 inline" /> Open Security Center <span aria-hidden="true">›</span></button><button onClick={async () => { await logout(); router.push("/"); }} className="min-h-14 rounded-full border border-slate-200 bg-white px-5 font-bold text-slate-950 hover:bg-slate-50"><Me2uIcon name="logout" size={22} className="mr-2 inline" /> Logout</button></div>
  </main>;
}

function Metric({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: "star" | "globe" | "referral" }) { return <div className="min-w-0 px-3 first:pl-0 last:pr-0"><p className="truncate text-xs font-bold uppercase tracking-[.08em] text-slate-500">{title}</p><span className="reference-icon mt-3 h-11 w-11"><Me2uIcon name={icon} size={20} /></span><b className="mt-2 block break-words text-base text-slate-950">{value}</b><small className="mt-1 block text-xs leading-relaxed text-slate-500">{detail}</small></div>; }
