"use client";

import * as React from "react";
import { useRef, useState } from "react";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  secure?: boolean;
  disabled?: boolean;
}

export function PinInput({
  value = "",
  onChange,
  length = 4,
  secure = false,
  disabled = false,
}: PinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= length) {
      onChange(val);
    }
  };

  const digits = value.split("");
  const items = Array.from({ length }, (_, i) => digits[i] || "");

  return (
    <div
      onClick={handleContainerClick}
      className={`relative flex items-center justify-center gap-3 cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {/* Hidden input to handle focus and input events */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        disabled={disabled}
        autoComplete="one-time-code"
      />

      {/* Visual boxes representing each digit */}
      {items.map((char, index) => {
        const isActive = isFocused && (index === value.length || (index === length - 1 && value.length === length));
        const hasValue = char !== "";

        return (
          <div
            key={index}
            className={`flex h-14 w-14 items-center justify-center rounded-[8px] border-2 bg-[var(--mobile-surface-muted)] text-xl font-bold font-mono transition-all duration-200 ${
              isActive
                ? "border-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]/20 scale-[1.05]"
                : hasValue
                ? "border-[var(--color-border)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)]/30"
            }`}
          >
            {hasValue ? (secure ? "•" : char) : ""}
          </div>
        );
      })}
    </div>
  );
}
