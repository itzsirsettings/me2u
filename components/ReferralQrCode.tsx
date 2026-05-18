"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

type ReferralQrCodeProps = {
  value: string;
  className?: string;
};

export default function ReferralQrCode({ value, className = "" }: ReferralQrCodeProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!value) {
      setDataUrl("");
      setHasError(false);
      return () => {
        isActive = false;
      };
    }

    setHasError(false);
    QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 192,
      color: {
        dark: "#001f35",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isActive) setDataUrl(url);
      })
      .catch(() => {
        if (isActive) {
          setDataUrl("");
          setHasError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [value]);

  return (
    <div
      className={`grid place-items-center overflow-hidden border border-[var(--color-border)] bg-white ${className}`}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
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
