"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import ErrorBoundary from "@/components/ui/ErrorBoundary";

const AuthBootstrap = dynamic(() => import("@/components/AuthBootstrap"));
const BottomNav = dynamic(() => import("@/components/BottomNav"));
const Me2UAssistantWidget = dynamic(() => import("@/components/Me2UAssistantWidget"));
const MobileHeader = dynamic(() => import("@/components/MobileHeader"));
const ProtectedOnboarding = dynamic(() => import("@/components/ProtectedOnboarding"));
const SpotlightPointer = dynamic(() =>
  import("@/components/ui/spotlight-card").then((module) => module.SpotlightPointer),
);
export default function AppRouteChrome() {
  const pathname = usePathname();

  // The marketing homepage has its own navigation and does not need an app
  // session bootstrap, account assistant, or persistent app navigation.
  if (pathname === "/") return null;

  return (
    <>
      <SpotlightPointer />
      <AuthBootstrap />
      <ProtectedOnboarding />
      <MobileHeader />
      <ErrorBoundary
        fallback={
          <div className="fixed bottom-20 right-4 z-40 max-w-xs rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <p className="text-xs font-bold text-card-foreground">Assistant unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">Refresh the page to try again.</p>
          </div>
        }
      >
        <Me2UAssistantWidget />
      </ErrorBoundary>
      <BottomNav />
    </>
  );
}
