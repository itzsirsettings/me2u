export const mobileAppReadiness = [
  {
    title: "Progressive Web App",
    status: "Available",
    detail:
      "The responsive web app includes a web manifest, install prompt, service worker, and offline fallback. Store distribution is separate work.",
  },
  {
    title: "Push notifications",
    status: "Planned",
    detail:
      "No push service or notification permission flow is implemented. Add it only with opt-in, delivery controls, and user-visible settings.",
  },
  {
    title: "Android app",
    status: "PWA only",
    detail:
      "Android users continue to use the installable web app. No Google Play release is currently planned.",
  },
  {
    title: "iPhone app",
    status: "In development",
    detail:
      "A bare React Native iOS client now supports secure sign-in, wallet and loan overview, registration transfer details, and account-deletion requests. Store signing, legal review, privacy disclosures, and device acceptance remain release gates.",
  },
] as const;
