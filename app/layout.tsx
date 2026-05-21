import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import BottomNav from "@/components/BottomNav";
import AuthBootstrap from "@/components/AuthBootstrap";
import MobileHeader from "@/components/MobileHeader";

const themeScript = `
(() => {
  try {
    const storedTheme = localStorage.getItem("me2u-theme");
    const mode = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system";
    const theme = mode === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.themeMode = "system";
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export const metadata: Metadata = {
  title: "me2u - Peer to Peer Lending",
  description: "Secure P2P Lending in Nigeria",
  icons: {
    icon: "/me2u_logo_v2.svg",
    shortcut: "/me2u_logo_v2.svg",
    apple: "/me2u_logo_v2.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AuthBootstrap />
        <MobileHeader />
        {children}
        <BottomNav />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
