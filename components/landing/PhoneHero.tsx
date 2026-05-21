"use client";

import {
  Bell,
  Eye,
  ReceiptText,
  TrendingUp,
  CreditCard,
  Shield,
  HelpCircle,
  BookOpen,
  Home,
  Wallet,
  UserRound,
  Banknote,
  ArrowDownToLine,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const quickActions = [
  { label: "Pay Bills", icon: ReceiptText, color: "bg-violet-200 text-violet-700" },
  { label: "Market", icon: TrendingUp, color: "bg-orange-200 text-orange-700" },
  { label: "Loans", icon: CreditCard, color: "bg-fuchsia-200 text-fuchsia-800" },
  { label: "KYC", icon: Shield, color: "bg-emerald-200 text-cyan-800" },
];

const utilityActions = [
  { label: "Support", icon: HelpCircle, color: "bg-sky-100 text-sky-700" },
  { label: "Learn", icon: BookOpen, color: "bg-emerald-50 text-emerald-700" },
  { label: "Secure", icon: Shield, color: "bg-violet-100 text-violet-700" },
];

const scoreItems = [
  { title: "Completed KYC", subtitle: "Identity approved", value: "18/18" },
  { title: "Repayment history", subtitle: "1 completed", value: "18/18" },
  { title: "Wallet activity", subtitle: "14 wallet records", value: "12/12" },
  { title: "Referral quality", subtitle: "Invite verified users", value: "0/10" },
];

const bottomNav = [
  { label: "Home", icon: Home, active: true },
  { label: "Market", icon: TrendingUp },
  { label: "Wallet", icon: Wallet },
  { label: "Profile", icon: UserRound },
];

function StatusBar() {
  return (
    <div className="relative flex h-[52px] items-center justify-between px-[36px] pt-[6px] text-slate-950">
      <span className="text-[17px] font-black leading-none tracking-tight">9:41</span>

      <div className="absolute left-1/2 top-[12px] h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_3px_rgba(255,255,255,0.12),0_1px_1px_rgba(0,0,0,0.25)]">
        <div className="absolute right-[22px] top-[12px] h-[7px] w-[7px] rounded-full bg-blue-500/60" />
      </div>

      <div className="flex items-center gap-[5px]">
        <Signal size={17} strokeWidth={3.2} />
        <Wifi size={17} strokeWidth={3.2} />
        <BatteryFull size={20} strokeWidth={2.9} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between px-[28px] pt-[12px]">
      <div className="flex items-center gap-[13px]">
        <div className="relative h-[58px] w-[58px] overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
          <BrandLogo className="h-full w-full p-2" imageClassName="h-full w-full" />
        </div>
        <div className="-mt-[2px] leading-[1.1]">
          <p className="text-[24px] font-bold tracking-tight text-slate-900">@chibaby</p>
        </div>
      </div>

      <div className="relative grid h-[52px] w-[52px] place-items-center rounded-2xl bg-white border border-slate-100 shadow-sm">
        <Bell size={24} strokeWidth={2} className="text-slate-900" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white ring-4 ring-[#eef7ff]">
          8
        </span>
      </div>
    </div>
  );
}

function BalanceCard() {
  return (
    <section className="mx-[18px] mt-[24px] rounded-[32px] bg-slate-900 p-[24px] shadow-xl text-white">
      <div className="flex items-start justify-between">
        <div>
          <div className="mt-[12px] flex items-center gap-[12px]">
            <p className="text-[36px] font-bold tracking-tight text-white">₦8,000,000</p>
            <Eye size={24} strokeWidth={2} className="text-slate-400" />
          </div>
        </div>
        <div className="rounded-xl bg-white/10 px-[12px] py-[6px] text-[11px] font-medium text-slate-300 backdrop-blur-sm">
          Polaris • 4266
        </div>
      </div>

      <div className="mt-[32px] grid grid-cols-2 gap-[14px]">
        <button className="flex h-[52px] items-center justify-center gap-[10px] rounded-2xl bg-emerald-500 text-[16px] font-bold text-slate-900 transition-transform active:scale-95">
          <Banknote size={20} />
          Receive
        </button>
        <button className="flex h-[52px] items-center justify-center gap-[10px] rounded-2xl bg-white/10 text-[16px] font-bold text-white backdrop-blur-sm transition-transform active:scale-95">
          <ArrowDownToLine size={20} />
          Withdraw
        </button>
      </div>
    </section>
  );
}

function ActionPanel({ variant = "quick" }: { variant?: "quick" | "utility" }) {
  const items = variant === "quick" ? quickActions : utilityActions;
  const columns = variant === "quick" ? "grid-cols-4" : "grid-cols-3";

  return (
    <section className={`mx-[18px] mt-[16px] grid ${columns} gap-2`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.label} className="flex flex-col items-center justify-center gap-[10px] rounded-[24px] bg-white p-4 shadow-sm border border-slate-50 transition-all active:scale-95">
            <div className={`grid h-[44px] w-[44px] place-items-center rounded-2xl ${item.color.split(' ')[0]} bg-opacity-10 ${item.color.split(' ')[1]}`}>
              <Icon size={22} strokeWidth={2} />
            </div>
            <p className="text-[13px] font-bold tracking-tight text-slate-900">{item.label}</p>
          </button>
        );
      })}
    </section>
  );
}

function TrustScore() {
  return (
    <section className="mx-[18px] mt-[16px] mb-[120px] rounded-[32px] bg-white p-[24px] shadow-sm border border-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-slate-900">Me2U Trust Score</h2>
          <p className="mt-[4px] text-[14px] font-medium text-slate-500">Gold level • 10 to Platinum</p>
        </div>
        <div className="relative grid h-[64px] w-[64px] place-items-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="176" strokeDashoffset="35" className="text-emerald-500" strokeLinecap="round" />
          </svg>
          <span className="text-[20px] font-bold text-slate-900">80</span>
        </div>
      </div>

      <div className="mt-[24px] space-y-[12px]">
        {scoreItems.slice(0, 2).map((item) => (
          <div key={item.title} className="flex items-center justify-between rounded-2xl bg-slate-50 p-[16px]">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">{item.title}</h3>
              <p className="text-[13px] font-medium text-slate-500">{item.subtitle}</p>
            </div>
            <p className="text-[16px] font-bold text-emerald-600">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomNavigation() {
  return (
    <nav className="absolute bottom-[24px] left-[18px] right-[18px] z-20 flex h-[76px] items-center justify-around rounded-[28px] bg-slate-900/95 p-[8px] shadow-2xl backdrop-blur-xl">
      {bottomNav.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.label} className={`flex h-[56px] w-[56px] flex-col items-center justify-center rounded-2xl transition-all ${item.active ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            <Icon size={24} strokeWidth={item.active ? 2.5 : 2} />
          </button>
        );
      })}
    </nav>
  );
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[878px] w-[423px] rounded-[57px] bg-black p-[7px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_18px_35px_rgba(0,0,0,0.22)]">
      <div className="absolute -left-[3px] top-[157px] h-[58px] w-[4px] rounded-l-full bg-neutral-950" />
      <div className="absolute -left-[3px] top-[232px] h-[76px] w-[4px] rounded-l-full bg-neutral-950" />
      <div className="absolute -right-[3px] top-[256px] h-[105px] w-[4px] rounded-r-full bg-neutral-950" />
      <div className="h-full w-full overflow-hidden rounded-[50px] bg-gradient-to-b from-[#eef7ff] via-[#eef3f8] to-[#f3f7fb]">
        {children}
      </div>
    </div>
  );
}

export default function PhoneHero() {
  return (
    <div className="@container mx-auto w-[calc(100%-40px)] sm:w-[320px] lg:w-full max-w-[423px] py-12 lg:py-0">
      <div className="relative w-full aspect-[423/878]">
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 origin-top transition-transform duration-500"
          style={{ 
            transform: 'translateX(-50%) scale(calc(100cqw / 423))',
            width: '423px',
            height: '878px'
          }}
        >
          <div className="rotate-x-[4deg] -rotate-y-[4deg] shadow-2xl rounded-[57px]">
            <PhoneShell>
              <div className="relative h-full overflow-hidden">
                <StatusBar />
                <Header />
                <BalanceCard />
                <ActionPanel />
                <ActionPanel variant="utility" />
                <TrustScore />
                <BottomNavigation />
              </div>
            </PhoneShell>
          </div>
        </div>
      </div>
    </div>
  );
}
