"use client";

import { useEffect, useRef, useState } from "react";
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
  { label: "Pay Bills", icon: ReceiptText, color: "bg-lime/20 text-lime" },
  { label: "Market", icon: TrendingUp, color: "bg-green/20 text-green" },
  { label: "Loans", icon: CreditCard, color: "bg-lime text-navy" },
  { label: "KYC", icon: Shield, color: "bg-green text-navy" },
];

const utilityActions = [
  { label: "Support", icon: HelpCircle, color: "bg-slate text-snow" },
  { label: "Learn", icon: BookOpen, color: "bg-lime/20 text-lime" },
  { label: "Secure", icon: Shield, color: "bg-green/20 text-green" },
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

const PHONE_WIDTH = 423;
const PHONE_HEIGHT = 878;
const INITIAL_PHONE_SCALE = 0.66;

function StatusBar() {
  return (
    <div className="relative flex h-[52px] items-center justify-between px-[36px] pt-[6px] text-navy">
      <span className="text-[17px] font-black leading-none tracking-tight">9:41</span>

      <div className="absolute left-1/2 top-[12px] h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-navy shadow-[inset_0_1px_3px_rgba(248,250,252,0.12),0_1px_1px_rgba(8,19,32,0.25)]">
        <div className="absolute right-[22px] top-[12px] h-[7px] w-[7px] rounded-full bg-green/70" />
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
        <div className="relative h-[58px] w-[58px] overflow-hidden rounded-full border border-navy/10 bg-snow shadow-sm">
          <BrandLogo className="h-full w-full p-2" imageClassName="h-full w-full" />
        </div>
        <div className="-mt-[2px] leading-[1.1]">
          <p className="text-[24px] font-bold tracking-tight text-navy">@chibaby</p>
        </div>
      </div>

      <div className="relative grid h-[52px] w-[52px] place-items-center rounded-2xl bg-snow border border-navy/10 shadow-sm">
        <Bell size={24} strokeWidth={2} className="text-navy" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green text-[11px] font-bold text-navy ring-4 ring-snow">
          8
        </span>
      </div>
    </div>
  );
}

function BalanceCard() {
  return (
    <section className="mx-[18px] mt-[24px] rounded-[32px] bg-navy p-[24px] shadow-xl text-snow">
      <div className="flex items-start justify-between">
        <div>
          <div className="mt-[12px] flex items-center gap-[12px]">
            <p className="text-[36px] font-bold tracking-tight text-snow">₦8,000,000</p>
            <Eye size={24} strokeWidth={2} className="text-snow/60" />
          </div>
        </div>
        <div className="rounded-xl bg-snow/10 px-[12px] py-[6px] text-[11px] font-medium text-snow/70 backdrop-blur-sm">
          Polaris • 4266
        </div>
      </div>

      <div className="mt-[32px] grid grid-cols-2 gap-[14px]">
        <button className="flex h-[52px] items-center justify-center gap-[10px] rounded-2xl bg-green text-[16px] font-bold text-navy transition-transform active:scale-95">
          <Banknote size={20} />
          Receive
        </button>
        <button className="flex h-[52px] items-center justify-center gap-[10px] rounded-2xl bg-snow/10 text-[16px] font-bold text-snow backdrop-blur-sm transition-transform active:scale-95">
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
          <button key={item.label} className="flex flex-col items-center justify-center gap-[10px] rounded-[24px] bg-snow p-4 shadow-sm border border-navy/5 transition-all active:scale-95">
            <div className={`grid h-[44px] w-[44px] place-items-center rounded-2xl ${item.color.split(' ')[0]} bg-opacity-10 ${item.color.split(' ')[1]}`}>
              <Icon size={22} strokeWidth={2} />
            </div>
            <p className="text-[13px] font-bold tracking-tight text-navy">{item.label}</p>
          </button>
        );
      })}
    </section>
  );
}

function TrustScore() {
  return (
    <section className="mx-[18px] mt-[16px] mb-[120px] rounded-[32px] bg-snow p-[24px] shadow-sm border border-navy/5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-navy">Me2U Trust Score</h2>
          <p className="mt-[4px] text-[14px] font-medium text-slate-light">Gold level • 10 to Platinum</p>
        </div>
        <div className="relative grid h-[64px] w-[64px] place-items-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate/10" />
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="176" strokeDashoffset="35" className="text-green" strokeLinecap="round" />
          </svg>
          <span className="text-[20px] font-bold text-navy">80</span>
        </div>
      </div>

      <div className="mt-[24px] space-y-[12px]">
        {scoreItems.slice(0, 2).map((item) => (
          <div key={item.title} className="flex items-center justify-between rounded-2xl bg-slate/5 p-[16px]">
            <div>
              <h3 className="text-[15px] font-bold text-navy">{item.title}</h3>
              <p className="text-[13px] font-medium text-slate-light">{item.subtitle}</p>
            </div>
            <p className="text-[16px] font-bold text-green">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomNavigation() {
  return (
    <nav className="absolute bottom-[24px] left-[18px] right-[18px] z-20 flex h-[76px] items-center justify-around rounded-[28px] bg-navy/95 p-[8px] shadow-2xl backdrop-blur-xl">
      {bottomNav.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.label} className={`flex h-[56px] w-[56px] flex-col items-center justify-center rounded-2xl transition-all ${item.active ? 'bg-green text-navy' : 'text-snow/55 hover:text-snow'}`}>
            <Icon size={24} strokeWidth={item.active ? 2.5 : 2} />
          </button>
        );
      })}
    </nav>
  );
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[878px] w-[423px] rounded-[57px] bg-navy p-[7px] shadow-[inset_0_0_0_1px_rgba(248,250,252,0.25),0_18px_35px_rgba(8,19,32,0.22)]">
      <div className="absolute -left-[3px] top-[157px] h-[58px] w-[4px] rounded-l-full bg-navy" />
      <div className="absolute -left-[3px] top-[232px] h-[76px] w-[4px] rounded-l-full bg-navy" />
      <div className="absolute -right-[3px] top-[256px] h-[105px] w-[4px] rounded-r-full bg-navy" />
      <div className="h-full w-full overflow-hidden rounded-[50px] bg-gradient-to-b from-snow via-snow to-lime/10">
        {children}
      </div>
    </div>
  );
}

export default function PhoneHero() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(INITIAL_PHONE_SCALE);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateScale = () => {
      const nextScale = Math.min(1, frame.clientWidth / PHONE_WIDTH);
      setScale(Number(nextScale.toFixed(4)));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="mx-auto w-full max-w-[423px] py-10 sm:w-[320px] lg:w-full lg:py-0">
      <div className="relative mx-auto aspect-[423/878] w-full">
        <div 
          className="absolute left-1/2 top-0 origin-top transition-transform duration-500"
          style={{ 
            transform: `translateX(-50%) scale(${scale})`,
            width: PHONE_WIDTH,
            height: PHONE_HEIGHT
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
