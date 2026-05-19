"use client";

import { useEffect, useState } from "react";
import Icons8Icon from "@/components/Icons8Icon";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallButtonProps = {
  className?: string;
  label?: string;
};

export default function PwaInstallButton({
  className = "btn-primary min-h-11 w-full",
  label = "Install Me2U",
}: PwaInstallButtonProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    setIsStandalone(mediaQuery.matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (isStandalone) {
      toast.success("Me2U is already installed on this device.");
      return;
    }

    if (!installPrompt) {
      toast.info("Install will appear when this browser supports the Me2U app prompt.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === "accepted") {
      toast.success("Me2U install started.");
    } else {
      toast.info("Install skipped for now.");
    }
  };

  return (
    <button type="button" className={className} onClick={handleInstall}>
      <span>{isStandalone ? "Installed" : label}</span>
      <Icons8Icon name="mobile" size={18} />
    </button>
  );
}
