"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import Me2uIcon from "@/components/Me2uIcon";

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
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const updateDeviceState = () => {
      setIsStandalone(
        mediaQuery.matches ||
          Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
      );
      setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    };
    window.requestAnimationFrame(updateDeviceState);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsStandalone(
          mediaQuery.matches ||
            Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleInstall = async () => {
    if (isStandalone) {
      toast.success("Me2U is already installed on this device.");
      return;
    }

    if (!installPrompt) {
      if (isIos) {
        toast.info("Tap Share in Safari, then choose Add to Home Screen.");
        return;
      }
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
    <button
      type="button"
      className={className}
      onClick={() => {
        void handleInstall();
      }}
      aria-label={isStandalone ? "Me2U is installed" : label}
    >
      <span>{isStandalone ? "Installed" : label}</span>
      <Me2uIcon name="mobile" size={18} />
    </button>
  );
}
