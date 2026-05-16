import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import BottomNav from "@/components/BottomNav";
import AuthBootstrap from "@/components/AuthBootstrap";
import ThemeToggle from "@/components/ThemeToggle";
import MobileHeader from "@/components/MobileHeader";

const themeScript = `
(() => {
  try {
    const storedTheme = localStorage.getItem("me2u-theme");
    const theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export const metadata: Metadata = {
  title: "me2u - Peer to Peer Lending",
  description: "Secure P2P Lending Platform in Nigeria",
  icons: { icon: "/icon.svg" },
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
        <ThemeToggle />
        <BottomNav />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
