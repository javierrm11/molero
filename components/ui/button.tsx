import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-dark",
        dark: "bg-ink text-white hover:bg-ink/90",
        white: "bg-card text-ink hover:bg-white/80",
        tint: "bg-accent-tint text-accent-dark hover:bg-accent-soft",
        soft: "bg-bg text-ink hover:bg-line",
        ghost: "text-ink hover:bg-ink/5",
        danger: "bg-card text-danger hover:bg-red-50",
      },
      size: {
        sm: "h-10 rounded-[14px] px-3.5 text-[13px]",
        md: "h-12 rounded-[16px] px-4 text-sm",
        lg: "h-[54px] rounded-[18px] px-5 text-[15px]",
        icon: "size-11 rounded-[16px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
