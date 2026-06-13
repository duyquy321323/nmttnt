import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "md" | "lg" | "xl" | "full";
}

const MAX_WIDTH: Record<NonNullable<PageContainerProps["maxWidth"]>, string> = {
  md: "max-w-md",
  lg: "max-w-3xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

export function PageContainer({
  children,
  className,
  maxWidth = "xl",
}: PageContainerProps) {
  return (
    <div className={cn("page-scroll", className)}>
      <div className={cn("mx-auto w-full p-6", MAX_WIDTH[maxWidth])}>{children}</div>
    </div>
  );
}
