import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
};

export default function BrandLogo({ className, imageClassName }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img
        src="/me2u_logo.svg"
        alt="me2u"
        className={cn("block h-full w-full object-contain", imageClassName)}
      />
    </span>
  );
}
