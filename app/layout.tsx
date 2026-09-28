import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";

import AppRouteChrome from "@/components/AppRouteChrome";
import GlobalClientProviders from "@/components/GlobalClientProviders";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const siteUrl = "https://www.me2ulend.online";

const body = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

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
  metadataBase: new URL(siteUrl),
  title: {
    default: "Me2U — 0% Interest Loans. Built on Trust.",
    template: "%s · Me2U",
  },
  description:
    "Me2U is Nigeria's trust-based interest-free peer lending platform. Join verified communities, build your Trust Score, save towards goals, and access 0% interest loans with no hidden fees.",
  keywords: [
    "zero interest loans Nigeria",
    "peer to peer lending",
    "0% interest",
    "trust score",
    "Nigeria fintech",
    "community lending circles",
    "savings goals",
    "Diaspora support",
    "verified wallet",
  ],
  openGraph: {
    title: "Me2U — 0% Interest Loans. Built on Trust.",
    description:
      "Nigeria's trust-based peer lending platform. 0% interest, no hidden fees, community circles, and transparent Trust Scores.",
    url: siteUrl,
    siteName: "Me2U",
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: "/hero-final.webp",
        width: 1680,
        height: 944,
        alt: "Me2U interest-free lending platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Me2U — 0% Interest Loans. Built on Trust.",
    description:
      "Nigeria's trust-based peer lending platform. 0% interest, community circles, transparent scoring.",
    images: ["/hero-final.webp"],
  },
  icons: {
    icon: "/me2u-icon-192.png",
    shortcut: "/me2u-icon-192.png",
    apple: "/me2u-icon-180.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Me2U",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#4d4d4d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={body.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <GlobalClientProviders />
        <ServiceWorkerRegistration />
        <AppRouteChrome />
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
