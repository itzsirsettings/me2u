import { ReactNode } from "react";

export interface LoadingButtonProps {
  label?: string;
  loadingText?: string;
  successText?: string;
  onClick?: () => Promise<void> | void;
  variant?: "solid" | "outline";
  icon?: ReactNode;
  disabled?: boolean;
}

export default function LoadingButton(props: LoadingButtonProps): JSX.Element;
