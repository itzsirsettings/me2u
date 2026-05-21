import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  src?: string;
};

export default function BrandLogo({ className, imageClassName, src = "/me2u_logo_v2.svg" }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img
        src={src}
        alt="Me2U"
        className={cn("block h-full w-full object-contain", imageClassName)}
      />
    </span>
  );
}
