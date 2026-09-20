"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

type ReferralQrCodeProps = {
  value: string;
  className?: string;
};

export default function ReferralQrCode({ value, className = "" }: ReferralQrCodeProps) {
  const [result, setResult] = useState<{ value: string; dataUrl: string; hasError: boolean } | null>(null);
  const dataUrl = result?.value === value ? result.dataUrl : "";
  const hasError = result?.value === value && result.hasError;

  useEffect(() => {
    let isActive = true;

    if (!value) {
      return () => {
        isActive = false;
      };
    }

    QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 192,
      color: {
        dark: "#081320",
        light: "#F8FAFC",
      },
    })
      .then((url) => {
        if (isActive) setResult({ value, dataUrl: url, hasError: false });
      })
      .catch(() => {
        if (isActive) {
          setResult({ value, dataUrl: "", hasError: true });
        }
      });

    return () => {
      isActive = false;
    };
  }, [value]);

  return (
    <div
      className={`grid place-items-center overflow-hidden border border-[var(--color-border)] bg-snow ${className}`}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          width={192}
          height={192}
          alt="Referral invite QR code"
          className="h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <span className="px-2 text-center text-[10px] font-bold leading-tight text-[var(--color-text-secondary)]">
          {hasError ? "QR unavailable" : "Loading QR"}
        </span>
      )}
    </div>
  );
}
