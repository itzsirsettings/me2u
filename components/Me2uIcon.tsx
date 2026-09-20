import type { CSSProperties, ReactNode } from "react";

export const me2uIcons: Record<string, ReactNode> = {
  app: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  home: (
    <path
      fillRule="evenodd"
      d="M12 3.6 4.4 9.6c-.6.5-.9 1.1-.9 1.9v8.7c0 .9.7 1.6 1.6 1.6h14.6c.9 0 1.6-.7 1.6-1.6v-8.7c0-.8-.4-1.5-.9-1.9L12 3.6Zm0 2.9 5.2 4.3c.5.4.8 1 .8 1.6v7.1H6v-7.1c0-.6.3-1.2.8-1.6L12 6.5ZM9.9 15.3v4.1h4.4v-4.1h-4.4Z"
    />
  ),
  wallet: (
    <path
      fillRule="evenodd"
      d="M6.6 6.4h11.8a2.6 2.6 0 0 1 2.6 2.6v10.9a2.6 2.6 0 0 1-2.6 2.6H6.6A2.6 2.6 0 0 1 4 19.9V9a2.6 2.6 0 0 1 2.6-2.6Zm.4 2.2a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Zm10.2 3h-8.2v2h8.2Zm0 4h-8.2v2h8.2Zm-8.2-8h8.2v1.5H8.6Z"
    />
  ),
  market: (
    <>
      <rect x="4" y="13.6" width="4.2" height="6.4" rx="1.4" />
      <rect x="9.9" y="9.4" width="4.2" height="10.6" rx="1.4" />
      <rect x="15.8" y="4.6" width="4.2" height="15.4" rx="1.4" />
    </>
  ),
  loans: (
    <path
      fillRule="evenodd"
      d="M5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9A2.5 2.5 0 0 1 5.5 5Zm1.6 1.5v2.7h4v-2.7Zm5.5 0v2.7h4v-2.7Zm1.8 5.1-.9-.9-.9.9-1.8-1.8h5.4Z"
    />
  ),
  profile: (
    <>
      <circle cx="12" cy="8.2" r="3.9" />
      <path d="M4.6 20.2v-1.1c0-3.3 3.3-5.4 7.4-5.4s7.4 2.1 7.4 5.4v1.1c0 .5-.4.9-.9.9H5.5c-.5 0-.9-.4-.9-.9Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <rect x="10.9" y="2.4" width="2.2" height="3.6" rx="1.1" />
      <rect x="10.9" y="18" width="2.2" height="3.6" rx="1.1" />
      <rect x="2.4" y="10.9" width="3.6" height="2.2" rx="1.1" />
      <rect x="18" y="10.9" width="3.6" height="2.2" rx="1.1" />
      <rect x="4.7" y="4.7" width="2.2" height="3.4" rx="1.1" transform="rotate(45 5.8 6.4)" />
      <rect
        x="17.1"
        y="17.1"
        width="2.2"
        height="3.4"
        rx="1.1"
        transform="rotate(45 18.2 18.8)"
      />
      <rect
        x="4.7"
        y="15.9"
        width="2.2"
        height="3.4"
        rx="1.1"
        transform="rotate(45 5.8 17.6)"
      />
      <rect
        x="17.1"
        y="3.5"
        width="2.2"
        height="3.4"
        rx="1.1"
        transform="rotate(45 18.2 5.2)"
      />
    </>
  ),
  moon: <path d="M13.4 3.1a8.9 8.9 0 1 0 7.6 13.4A7.2 7.2 0 0 1 13.4 3.1Z" />,
  shield: <path d="M12 3.2 18.8 5.8v5c0 4.5-2.8 7.9-6.8 9.9-4-2-6.8-5.4-6.8-9.9v-5Z" />,
  email: (
    <path
      fillRule="evenodd"
      d="M4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-11A2.5 2.5 0 0 1 4.5 4Zm.3 2.6L12 11.9l7.2-5.3v1.2L12 13.1 4.8 7.8Z"
    />
  ),
  phone: (
    <path d="M6.7 3.4a2.1 2.1 0 0 0-2.9 2.5c.5 2.8 2.3 6 4.8 8.5s5.7 4.3 8.5 4.8a2.1 2.1 0 0 0 2.5-2.9l-2.5-5.2a1.6 1.6 0 0 0-1.9-.9l-2 .6a9.6 9.6 0 0 1-3.1-3.1l.6-2a1.6 1.6 0 0 0-.9-1.9L6.7 3.4Z" />
  ),
  lock: (
    <path
      fillRule="evenodd"
      d="M7.4 9.6V7.2a4.6 4.6 0 0 1 9.2 0v2.4h.7A1.7 1.7 0 0 1 19 11.3v7.4a1.7 1.7 0 0 1-1.7 1.7H6.7A1.7 1.7 0 0 1 5 18.7v-7.4A1.7 1.7 0 0 1 6.7 9.6Zm2-2.4a2.6 2.6 0 0 1 5.2 0v2.4H9.4Zm2.6 4.9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-1 3.3v2.1h2v-2.1a1.9 1.9 0 1 0-2 0Z"
    />
  ),
  visible: (
    <path
      fillRule="evenodd"
      d="M12 5.6c-5.1 0-9.1 3.7-10.1 6.4C2.9 14.7 6.9 18.4 12 18.4s9.1-3.7 10.1-6.4C21.1 9.3 17.1 5.6 12 5.6Zm0 2.1a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6Zm0 1.7a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z"
    />
  ),
  invisible: (
    <path
      fillRule="evenodd"
      d="M12 5.6c-5.1 0-9.1 3.7-10.1 6.4C2.9 14.7 6.9 18.4 12 18.4s9.1-3.7 10.1-6.4C21.1 9.3 17.1 5.6 12 5.6Zm0 2.1a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6Zm0 1.7a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2ZM20.3 4.8 19.5 4 5.4 18.9l.8.8Z"
    />
  ),
  referral: (
    <>
      <circle cx="9.6" cy="8.3" r="3.3" />
      <circle cx="17" cy="9.8" r="2.5" />
      <path d="M4 19.4v-1.2c0-2.9 2.5-4.8 5.6-4.8s5.6 1.9 5.6 4.8v1.2c0 .4-.4.8-.8.8H4.8c-.4 0-.8-.4-.8-.8Z" />
      <path d="M15 19.4v-1.2c0-2.1 1.4-3.8 3.4-4.6a.5.5 0 0 1 .7.5v5.3c0 .4-.4.8-.8.8h-2.6a.7.7 0 0 1-.7-.8Z" />
    </>
  ),
  moneyBag: (
    <>
      <path d="M6.8 6.2h10.4l1.4 3.4H5.4Z" />
      <path
        fillRule="evenodd"
        d="M5.1 9.6h13.8a2 2 0 0 1 2 2v6.6a2.6 2.6 0 0 1-2.6 2.6H5.7a2.6 2.6 0 0 1-2.6-2.6v-7.6a2 2 0 0 1 2-2Zm6.9 2.2v6.5h.9v-6.5Zm-1 2.2h2.6v1H11Zm0 2.4h2.6v1H11Zm2.7-1.8-3.9 5.2 1.1.8 3.9-5.2Z"
      />
    </>
  ),
  requestMoney: (
    <path
      fillRule="evenodd"
      d="M6.4 4h11.2A2.4 2.4 0 0 1 20 6.4v5.1h-1.8V6.5H5.8v11h4.8V20H6.4A2.4 2.4 0 0 1 4 17.6V6.4A2.4 2.4 0 0 1 6.4 4Zm5.6 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm4.3 1.1 3 3h-1.9v4.2h-2.2v-4.2h-1.9Z"
    />
  ),
  bank: (
    <>
      <path d="M3.4 9.6 12 4.2l8.6 5.4v1.2H3.4Z" />
      <rect x="3.4" y="11" width="17.2" height="1.5" rx="0.75" />
      <rect x="5.6" y="12.5" width="2" height="5.1" rx="1" />
      <rect x="9.2" y="12.5" width="2" height="5.1" rx="1" />
      <rect x="12.8" y="12.5" width="2" height="5.1" rx="1" />
      <rect x="16.4" y="12.5" width="2" height="5.1" rx="1" />
      <rect x="3.4" y="17.7" width="17.2" height="2.2" rx="1.1" />
    </>
  ),
  cash: (
    <path
      fillRule="evenodd"
      d="M6.4 4h11.2A2.4 2.4 0 0 1 20 6.4v11.2A2.4 2.4 0 0 1 17.6 20H6.4A2.4 2.4 0 0 1 4 17.6V6.4A2.4 2.4 0 0 1 6.4 4Zm5.6 8.2a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm0 1.5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z"
    />
  ),
  tap: (
    <>
      <rect x="4" y="4.4" width="11.4" height="15.2" rx="2.6" />
      <path d="M16.6 8.4a5.8 5.8 0 0 1 0 7.6l-1.4-1.4a4.2 4.2 0 0 0 0-4.9Z" />
      <path d="M19.4 5.8a9.1 9.1 0 0 1 0 12.8l-1.4-1.4a7.5 7.5 0 0 0 0-10.1Z" />
    </>
  ),
  check: (
    <path
      fillRule="evenodd"
      d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6Zm-2 7.4 1.4 1.4 1.4-1.4 4.4 4.4-.4.5L10.4 14.4Z"
    />
  ),
  back: (
    <path
      fillRule="evenodd"
      d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM7 12l4.6-3.6v2.6h4.8v2h-4.8v2.6Z"
    />
  ),
  globe: (
    <path
      fillRule="evenodd"
      d="M12 3.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6Zm0 2.3v12.1a6.1 6.1 0 0 0 0-12.1Zm-5.6 5.1h11.2a1.1 1.1 0 0 1 0 2.2H6.4a1.1 1.1 0 0 1 0-2.2Z"
    />
  ),
  certificate: (
    <path
      fillRule="evenodd"
      d="M12 3.7a7.1 7.1 0 1 0 0 14.2 7.1 7.1 0 0 0 0-14.2Zm0 2.6a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.9a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Zm-.6 1.4 3.2 3.2-.8.8-2.7-2.7-.8.8-.8-.8ZM9.4 17.8c.7-1.1 1.9-1.8 3-1.8s2.3.7 3 1.8l.1 3.5-3.1-1.6-3.1 1.6Z"
    />
  ),
  group: (
    <>
      <circle cx="9.2" cy="8.6" r="3.2" />
      <circle cx="16.8" cy="10" r="2.4" />
      <path d="M3.8 19.4v-1.1c0-2.8 2.4-4.7 5.4-4.7s5.4 1.9 5.4 4.7v1.1c0 .4-.4.8-.9.8H4.7c-.5 0-.9-.4-.9-.8Z" />
      <path d="M14.6 19.4v-1.1c0-1.9 1.2-3.5 3-4.3v5.4c0 .4-.3.8-.8.8h-1.7a.5.5 0 0 1-.5-.8Z" />
      <circle cx="11.9" cy="4.2" r="1.5" />
    </>
  ),
  bill: (
    <path
      fillRule="evenodd"
      d="M7 3.2h10A2.2 2.2 0 0 1 19.2 5.4v13.2a2.2 2.2 0 0 1-2.2 2.2H7A2.2 2.2 0 0 1 4.8 18.6V5.4A2.2 2.2 0 0 1 7 3.2Zm.4 3v1.7h9.2V6.2Zm0 3.4v1.7h9.2V9.6Zm0 3.4v1.7h6V13Z"
    />
  ),
  savings: (
    <path
      fillRule="evenodd"
      d="M6.6 4h10.8A2.6 2.6 0 0 1 20 6.6v10.8A2.6 2.6 0 0 1 17.4 20H6.6A2.6 2.6 0 0 1 4 17.4V6.6A2.6 2.6 0 0 1 6.6 4Zm0 1.6c-.6 0-1 .4-1 1v10.8c0 .6.4 1 1 1h10.8c.6 0 1-.4 1-1V6.6c0-.6-.4-1-1-1Zm5.4 4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm0 1a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm4-3.6h1.4v5h-1.4Z"
    />
  ),
  deal: (
    <path
      fillRule="evenodd"
      d="M13.6 3.2h-7a2 2 0 0 0-2 2v7l5.6 5.7a1.6 1.6 0 0 0 2.3 0l5.9-5.9a1.6 1.6 0 0 0 0-2.3L14.5 4.9a2 2 0 0 0-1-1.7Zm-3.3 8.9a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8Zm.9-5.7-1.2 1.2 3.9 3.9 1.2-1.2Z"
    />
  ),
  family: (
    <>
      <circle cx="8" cy="7.6" r="3.1" />
      <circle cx="16.6" cy="8.6" r="2.4" />
      <path d="M3.9 19.3v-1.1c0-2.8 2.3-4.7 4.8-4.7s4.8 1.9 4.8 4.7v1.1c0 .4-.4.8-.9.8H4.8c-.5 0-.9-.4-.9-.8Z" />
      <path d="M14.2 19.3v-1.1c0-1.8 1.1-3.3 2.9-4v5.1c0 .4-.3.8-.8.8h-1.6a.5.5 0 0 1-.5-.8Z" />
      <circle cx="11.4" cy="4" r="1.5" />
    </>
  ),
  receipt: (
    <path
      fillRule="evenodd"
      d="M7 3.2h8.6L18.8 6.4v12.4A2.2 2.2 0 0 1 16.6 21H7a2.2 2.2 0 0 1-2.2-2.2V5.4A2.2 2.2 0 0 1 7 3.2Zm6.4 2.2v2.2h2.2Zm-7.8 4h7v1.4h-7Zm0 3.4h9v1.4h-9Zm0 3.4h6.5v1.4h-6.5Z"
    />
  ),
  star: <path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.7l-5.2 2.9 1-5.9-4.3-4.1 5.9-.8Z" />,
  qr: (
    <path
      fillRule="evenodd"
      d="M4.4 4.4h6.2v6.2H4.4Zm1.5 1.5v3.2h3.2V5.9Zm8.4-1.5h6.2v6.2h-6.2Zm1.5 1.5v3.2h3.2V5.9ZM4.4 14.4h6.2v6.2H4.4Zm1.5 1.5v3.2h3.2v-3.2Zm7.3 0v2.9h3v-2.9Zm4.1 0v2.9h1.5v-2.9Zm-2-5.6h1.5v1.5h-1.5Zm-3.9 2h1.5v1.5h-1.5Zm5.4 0h1.6v1.5h-1.6Z"
    />
  ),
  trophy: (
    <>
      <path d="M8 3.4h8v5.6c0 2.2-1.8 4-4 4s-4-1.8-4-4Z" />
      <rect x="4" y="4.4" width="2.4" height="7" rx="1.2" transform="rotate(10 5.2 7.9)" />
      <rect x="17.6" y="4.4" width="2.4" height="7" rx="1.2" transform="rotate(-10 18.8 7.9)" />
      <rect x="10.8" y="12.1" width="2.4" height="2.1" rx="1" />
      <rect x="7.8" y="14.2" width="8.4" height="2.6" rx="1.3" />
      <rect x="6.6" y="16.8" width="10.8" height="2" rx="1" />
    </>
  ),
  medal: (
    <path
      fillRule="evenodd"
      d="M8.9 3.4h6.2l.6 1.4H8.3ZM12 6.4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 1.1 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4Zm-2.8 9.6a2.4 2.4 0 0 1 2.6-2.4 2.4 2.4 0 0 1 2.6 2.4v1h-5.2Z"
    />
  ),
  book: (
    <path
      fillRule="evenodd"
      d="M12 6.7c-1.3-1.4-3.4-2.1-7.2-2.1-.5 0-.9.4-.9 1v11.6c0 .6.5 1.1 1.1 1 3.7-.4 5.9.4 7 1.9.2.4.9.4 1.1 0 1.1-1.5 3.3-2.3 7-1.9.6.1 1.1-.4 1.1-1V5.6c0-.6-.4-1-.9-1-3.8 0-5.9.7-7.2 2.1ZM6.3 8.8h2.8v1.1H6.3Zm0 2.1h2.8v1.1H6.3Zm8.6-2.1h2.8v1.1h-2.8Zm0 2.1h2.8v1.1h-2.8Z"
    />
  ),
  security: (
    <path
      fillRule="evenodd"
      d="M12 3.2 18.8 5.8v5c0 4.5-2.8 7.9-6.8 9.9-4-2-6.8-5.4-6.8-9.9v-5Zm-2.4 9 1.4-1.4 1.4 1.4 4-4 .8.8-4.8 4.8L9.6 12.3Z"
    />
  ),
  fingerprint: (
    <>
      <path d="M12 3a9 9 0 0 1 9 9v.3a.7.7 0 0 1-.7.7h-.5a.7.7 0 0 1-.7-.7v-.1a7.1 7.1 0 0 0-14.2 0v.1a.7.7 0 0 1-.7.7h-.5A.7.7 0 0 1 3 12a9 9 0 0 1 9-9Z" />
      <path d="M12 7.4a4.6 4.6 0 0 1 4.6 4.6v.3a.7.7 0 0 1-.7.7h-.5a.7.7 0 0 1-.7-.7 2.7 2.7 0 0 0-5.4 0v.3a.7.7 0 0 1-.7.7h-.5a.7.7 0 0 1-.7-.7 4.6 4.6 0 0 1 4.6-4.6Z" />
      <path d="M11.1 12.4a.9.9 0 0 1 .9-.9h0a.9.9 0 0 1 .9.9V13a.9.9 0 0 1-.9.9h0a.9.9 0 0 1-.9-.9Z" />
      <path d="M7.9 17.9c.4.7.7 1.5.7 2.3v.5a.7.7 0 0 1-.7.7h-.5a.7.7 0 0 1-.7-.7c0-.6-.2-1.2-.5-1.8a.7.7 0 0 1 .3-1l.6-.2a.7.7 0 0 1 .8.2Z" />
      <path d="M16.1 17.9a.7.7 0 0 1 .8-.2l.6.2a.7.7 0 0 1 .3 1c-.3.6-.5 1.2-.5 1.8v.5a.7.7 0 0 1-.7.7h-.5a.7.7 0 0 1-.7-.7v-.5c0-.8.3-1.6.7-2.3Z" />
    </>
  ),
  key: (
    <>
      <circle cx="8.2" cy="8.2" r="3.9" />
      <rect x="11.2" y="7.15" width="8.6" height="2.5" rx="1.25" />
      <rect x="17.4" y="9.6" width="2.2" height="3.4" rx="1.1" />
      <rect x="14.2" y="9.6" width="2.2" height="2.6" rx="1.1" />
    </>
  ),
  alert: (
    <path
      fillRule="evenodd"
      d="M12 3.6 21 19.7a1 1 0 0 1-.9 1.4H3.9a1 1 0 0 1-.9-1.4ZM10.9 8.8v5.3h2.2V8.8Zm0 6.9v2.2h2.2v-2.2Z"
    />
  ),
  freeze: (
    <>
      <rect x="10.9" y="2.6" width="2.2" height="18.8" rx="1.1" />
      <rect x="10.9" y="2.6" width="2.2" height="18.8" rx="1.1" transform="rotate(60 12 12)" />
      <rect x="10.9" y="2.6" width="2.2" height="18.8" rx="1.1" transform="rotate(-60 12 12)" />
      <rect x="4.6" y="4.6" width="2" height="2" rx="1" />
      <rect x="17.4" y="17.4" width="2" height="2" rx="1" />
      <rect x="4.6" y="17.4" width="2" height="2" rx="1" />
      <rect x="17.4" y="4.6" width="2" height="2" rx="1" />
    </>
  ),
  download: (
    <>
      <path d="M12.75 2.8h-1.5v7.3l-2.4-2.5-1.2 1.2 4.35 4.4 4.35-4.4-1.2-1.2-2.4 2.5Z" />
      <rect x="2.8" y="17" width="18.4" height="3.6" rx="1.8" />
    </>
  ),
  mobile: (
    <path
      fillRule="evenodd"
      d="M8.4 3h7.2A2.6 2.6 0 0 1 18.2 5.6v12.8A2.6 2.6 0 0 1 15.6 21H8.4a2.6 2.6 0 0 1-2.6-2.6V5.6A2.6 2.6 0 0 1 8.4 3Zm0 1.6c-.6 0-1 .4-1 1v12.8c0 .6.4 1 1 1h7.2c.6 0 1-.4 1-1V5.6c0-.6-.4-1-1-1Zm3.6 14.2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z"
    />
  ),
  bell: (
    <>
      <path d="M12 2.9c-3.1 0-5.6 2.4-5.7 5.5-.1 1.8-.3 3.2-1.3 4.8a1.6 1.6 0 0 0 1.3 2.6h11.4a1.6 1.6 0 0 0 1.3-2.6c-1-1.6-1.2-3-1.3-4.8-.1-3.1-2.6-5.5-5.7-5.5Z" />
      <rect x="10.9" y="17.6" width="2.2" height="1.2" rx="0.6" />
      <circle cx="12" cy="20.2" r="1.5" />
    </>
  ),
  support: (
    <path
      fillRule="evenodd"
      d="M12 3.3a9.7 9.7 0 0 1 9.7 9.7 9.7 9.7 0 0 1-9.7 9.7A9.7 9.7 0 0 1 2.3 13 9.7 9.7 0 0 1 12 3.3Zm0 2.3A7.4 7.4 0 0 0 4.6 13 7.4 7.4 0 0 0 12 20.4 7.4 7.4 0 0 0 19.4 13 7.4 7.4 0 0 0 12 5.6Zm0 2.2A5.2 5.2 0 0 1 17.2 13 5.2 5.2 0 0 1 12 18.2 5.2 5.2 0 0 1 6.8 13 5.2 5.2 0 0 1 12 7.8Zm0 1.4a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Z"
    />
  ),
  fire: (
    <path
      fillRule="evenodd"
      d="M12 2.4c.4 0 .7.2.9.5 1.2 2.1 2.7 3.5 4.5 4.4a.9.9 0 0 1 .4 1.2c-.5 1.3-.6 2.6-.3 3.9a9 9 0 0 1-6.9 10.4c-4.8 1-9.4-2-10.4-6.8-.8-3.9 1.1-7.7 4.4-9.6a.9.9 0 0 1 1.3.5c.3 1 .9 1.9 1.7 2.6.3.3.8.2 1-.2.5-.9.8-1.8.9-2.8a.9.9 0 0 1 .4-.7c.6-.5 1.3-1 2.1-1.5Zm-1.7 6.3c-.8.2-1.4.7-1.9 1.5-.7 1.1-.8 2.5-.3 3.7.6 1.3 1.9 2.2 3.3 2.3 1.8.1 3.4-1.1 3.8-2.8.3-1.1.1-2.2-.5-3.2-.5-.9-1.4-1.5-2.4-1.7-.5-.1-1-.1-1.5 0-.2 0-.3.1-.5.2Z"
    />
  ),
  chat: (
    <path
      fillRule="evenodd"
      d="M6.4 4h11.2A2.4 2.4 0 0 1 20 6.4v8.8a2.4 2.4 0 0 1-2.4 2.4H8.8L4 21.2v-2.6a2.4 2.4 0 0 1-1.6-2.2V6.4A2.4 2.4 0 0 1 4.8 4Zm1.4 4v1.6h8.4V8Zm0 3.2v1.6h6.4v-1.6Z"
    />
  ),
  copy: (
    <>
      <rect x="8.2" y="8.2" width="12" height="12" rx="2" />
      <path d="M5.8 15.8H4.6A2.6 2.6 0 0 1 2 13.2V4.6A2.6 2.6 0 0 1 4.6 2h8.6a2.6 2.6 0 0 1 2.6 2.6v1.2h-2V4.6a.6.6 0 0 0-.6-.6H4.6a.6.6 0 0 0-.6.6v8.6c0 .3.3.6.6.6h1.2Z" />
    </>
  ),
  share: (
    <>
      <circle cx="6.8" cy="12" r="2.8" />
      <circle cx="17.2" cy="6.8" r="2.8" />
      <circle cx="17.2" cy="17.2" r="2.8" />
      <path
        d="M9.2 10.8 14.8 8M9.2 13.2 14.8 16"
        strokeWidth="1.6"
        stroke="currentColor"
        fill="none"
      />
    </>
  ),
  info: (
    <path
      fillRule="evenodd"
      d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm-1 8v4h2v-4Zm0-4v2h2V9Z"
    />
  ),
  close: (
    <>
      <path
        d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </>
  ),
  history: (
    <path
      fillRule="evenodd"
      d="M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2ZM12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm-.8 2.8v4.4l3.6 2.2.8-1.4-2.8-1.6V7.8Z"
    />
  ),
  send: (
    <path
      d="M3.4 12 20.6 3.4 12 20.6l-2.4-7.2ZM12 12l5.2-5.2M12 12 9.6 9.6Z"
      strokeWidth="1.6"
      stroke="currentColor"
      fill="none"
    />
  ),
  plus: (
    <path d="M12 5v14M5 12h14" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
  ),
  minus: <path d="M5 12h14" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" strokeWidth="2" stroke="currentColor" fill="none" />
      <path d="M15 15 20 20" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
    </>
  ),
  filter: (
    <>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </>
  ),
  edit: (
    <>
      <path d="M16.8 3.8 20.2 7.2l-10.4 10.4-4.4 1 1-4.4Z" />
      <path d="M15.4 5.2 18.8 8.6" strokeWidth="1.5" stroke="currentColor" fill="none" />
    </>
  ),
  trash: (
    <path
      fillRule="evenodd"
      d="M9.2 3.4h5.6v1.8H9.2ZM4 6.8h16v1.8H4Zm3.6 3.4v8.6a2 2 0 0 0 2 2h4.8a2 2 0 0 0 2-2v-8.6Zm3.2 1.6v5.4h1.8v-5.4Zm-1.8 0v5.4H7.6v-5.4Zm5.4 0v5.4h1.8v-5.4Z"
    />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M16.9 16.9l1.4 1.4M5.6 18.4l1.4-1.4M16.9 7.1l1.4-1.4"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </>
  ),
  calendar: (
    <path
      fillRule="evenodd"
      d="M6.4 4h11.2A2.4 2.4 0 0 1 20 6.4v11.2A2.4 2.4 0 0 1 17.6 20H6.4A2.4 2.4 0 0 1 4 17.6V6.4A2.4 2.4 0 0 1 6.4 4ZM5.6 9.2h12.8v8.4a.8.8 0 0 1-.8.8H6.4a.8.8 0 0 1-.8-.8ZM8 2.4v3.2h1.6V2.4Zm6.4 0v3.2H16V2.4Z"
    />
  ),
  clockHistoy: (
    <>
      <circle cx="12" cy="12" r="8" strokeWidth="2" stroke="currentColor" fill="none" />
      <path d="M12 7v5l3 3" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7.5" r="3" />
      <circle cx="16.5" cy="8.5" r="2.5" />
      <path d="M3.5 18.5v-1c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5v1c0 .3-.3.5-.7.5H4.2c-.4 0-.7-.2-.7-.5Z" />
      <path d="M14 18.5v-1c0-1.7 1-3.2 2.5-4v4.7c0 .3-.3.5-.6.5h-1.5c-.2 0-.4-.1-.4-.2Z" />
    </>
  ),
  logout: (
    <>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16 17l5-5-5-5M21 12H9"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  refresh: (
    <>
      <path
        d="M3 12a9 9 0 0 1 9-9c2.5 0 4.8 1 6.4 2.6L21 8"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M21 3v5h-5M21 12a9 9 0 0 1-9 9c-2.5 0-4.8-1-6.4-2.6L3 16"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M3 21v-5h5"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  upload: (
    <>
      <path
        d="M12 16V4M8 8l4-4 4 4"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="4" y="16" width="16" height="4" rx="1" />
    </>
  ),
  image: (
    <path
      fillRule="evenodd"
      d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h12v-3.6l-3.2-3.2-3.6 3.6-2.4-2.4ZM8.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
    />
  ),
  document: (
    <path
      fillRule="evenodd"
      d="M7 3h8l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 2v3h3ZM8 12h8v1.5H8Zm0 3h8v1.5H8Z"
    />
  ),
  link: (
    <>
      <path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  menu: (
    <path
      d="M4 6h16M4 12h16M4 18h16"
      strokeWidth="2"
      stroke="currentColor"
      strokeLinecap="round"
    />
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path
        d="M8 12l2 2 4-4"
        strokeWidth="2"
        stroke="white"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeWidth="2" stroke="white" strokeLinecap="round" />
    </>
  ),
};

export type Me2uIconName = keyof typeof me2uIcons;

type Me2uIconProps = {
  name: Me2uIconName;
  size?: number;
  className?: string;
  label?: string;
  decorative?: boolean;
};

export default function Me2uIcon({
  name,
  size = 24,
  className = "",
  label,
  decorative = true,
}: Me2uIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={decorative ? "true" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label || `${name} icon`}
      style={{ flexShrink: 0, vectorEffect: "non-scaling-stroke" } as CSSProperties}
    >
      {me2uIcons[name]}
    </svg>
  );
}
