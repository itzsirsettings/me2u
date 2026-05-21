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
    <div className="flex items-center justify-between px-[28px] pt-[7px]">
      <div className="flex items-center gap-[13px]">
        <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-[#24c45a] text-[26px] font-black text-white shadow-sm">
          C
        </div>
        <div className="-mt-[2px] leading-[1.04]">
          <p className="text-[21px] font-bold tracking-[-0.02em] text-slate-900">Welcome</p>
          <p className="text-[29px] font-black tracking-[-0.055em] text-slate-950">@chibaby</p>
        </div>
      </div>

      <div className="relative grid h-[57px] w-[57px] place-items-center rounded-full bg-white shadow-sm">
        <Bell size={29} strokeWidth={2.55} className="text-slate-950" />
        <span className="absolute right-[13px] top-[8px] text-[12px] font-black leading-none text-red-500">8</span>
      </div>
    </div>
  );
}

function BalanceCard() {
  return (
    <section className="mx-[18px] mt-[24px] rounded-[30px] bg-white px-[18px] pb-[18px] pt-[16px] shadow-[0_22px_50px_rgba(15,23,42,0.065)]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[24px] font-black leading-none tracking-[-0.045em] text-slate-950">Main Balance</h2>
        <div className="rounded-full bg-slate-50 px-[13px] py-[7px] text-[11px] font-black leading-none tracking-[-0.035em] text-slate-900 shadow-sm">
          Polaris Bank • 3051024266
        </div>
      </div>

      <div className="mt-[25px] flex items-center gap-[14px]">
        <p className="text-[39px] font-black leading-none tracking-[-0.065em] text-slate-950">₦8,000,000</p>
        <Eye size={27} strokeWidth={2.8} className="mt-[2px] text-slate-950" />
      </div>

      <div className="mt-[27px] grid grid-cols-2 gap-[18px]">
        <button className="flex h-[58px] items-center justify-center gap-[14px] rounded-full bg-[#edffd8] text-[25px] font-black tracking-[-0.055em] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          Receive
          <Banknote size={22} strokeWidth={2.7} />
        </button>
        <button className="flex h-[58px] items-center justify-center gap-[14px] rounded-full bg-[#edffd8] text-[25px] font-black tracking-[-0.055em] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          Withdraw
          <ArrowDownToLine size={21} strokeWidth={2.8} />
        </button>
      </div>
    </section>
  );
}

function ActionPanel({ variant = "quick" }: { variant?: "quick" | "utility" }) {
  const items = variant === "quick" ? quickActions : utilityActions;
  const columns = variant === "quick" ? "grid-cols-4" : "grid-cols-3";
  const height = variant === "quick" ? "h-[95px]" : "h-[90px]";

  return (
    <section className={`mx-[18px] mt-[16px] grid ${columns} ${height} overflow-hidden rounded-[25px] bg-white shadow-[0_16px_35px_rgba(15,23,42,0.055)]`}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="relative flex flex-col items-center justify-center gap-[7px]">
            {index !== 0 && <div className="absolute left-0 top-[16px] h-[63px] w-px bg-slate-200" />}
            <div className={`grid h-[43px] w-[43px] place-items-center rounded-full ${item.color}`}>
              <Icon size={21} strokeWidth={2.5} />
            </div>
            <p className="text-[17px] font-black leading-none tracking-[-0.045em] text-slate-950">{item.label}</p>
          </div>
        );
      })}
    </section>
  );
}

function TrustScore() {
  return (
    <section className="mx-[18px] mt-[18px] rounded-[27px] bg-white px-[18px] pb-[115px] pt-[26px] shadow-[0_22px_45px_rgba(15,23,42,0.055)]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[26px] font-black leading-none tracking-[-0.055em] text-slate-950">Me2U Trust Score</h2>
          <p className="mt-[13px] text-[18px] font-semibold leading-none tracking-[-0.04em] text-slate-800">Gold level • Platinum at 90</p>
        </div>
        <div className="mr-[10px] grid h-[76px] w-[76px] place-items-center rounded-full bg-[#e4faeb] text-[27px] font-black tracking-[-0.045em] text-emerald-600">
          80
        </div>
      </div>

      <div className="mt-[28px] space-y-[13px]">
        {scoreItems.map((item) => (
          <article key={item.title} className="flex min-h-[82px] items-start justify-between rounded-[18px] bg-slate-50 px-[18px] py-[16px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div>
              <h3 className="text-[18px] font-black leading-none tracking-[-0.045em] text-slate-950">{item.title}</h3>
              <p className="mt-[13px] text-[17px] font-semibold leading-none tracking-[-0.045em] text-slate-800">{item.subtitle}</p>
            </div>
            <p className="text-[20px] font-black leading-none tracking-[-0.045em] text-slate-950">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-[19px] grid grid-cols-2 gap-[14px]">
        <div className="h-[64px] rounded-[15px] border border-emerald-400 bg-emerald-50/80 px-4 pt-4 text-[14px] font-black text-emerald-700">
          Available
        </div>
        <div className="h-[64px] rounded-[15px] border border-emerald-400 bg-emerald-50/80 px-4 pt-4 text-[14px] font-black text-emerald-700">
          Eligible
        </div>
      </div>
    </section>
  );
}

function BottomNavigation() {
  return (
    <nav className="absolute bottom-[13px] left-[20px] right-[20px] z-20 grid h-[93px] grid-cols-4 rounded-[28px] bg-white/95 px-[14px] py-[10px] shadow-[0_8px_28px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      {bottomNav.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center justify-center">
            {item.active ? (
              <div className="flex h-full w-[86px] flex-col items-center justify-center rounded-[22px] bg-[#e8fbef] text-emerald-500">
                <Icon size={28} strokeWidth={2.55} />
                <span className="mt-[6px] text-[15px] font-black tracking-[-0.04em]">Home</span>
                <span className="mt-[5px] h-[8px] w-[37px] rounded-full bg-emerald-500" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-900">
                <Icon size={27} strokeWidth={2.45} />
                <span className="mt-[8px] text-[15px] font-black tracking-[-0.04em]">{item.label}</span>
              </div>
            )}
          </div>
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
