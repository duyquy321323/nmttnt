import { cn } from "@/lib/utils";

interface StatusMessageProps {
  children: React.ReactNode;
  variant?: "success" | "error" | "warning";
  className?: string;
}

export function StatusMessage({ children, variant = "success", className }: StatusMessageProps) {
  return (
    <p
      className={cn(
        "text-sm",
        variant === "success" && "text-green-600",
        variant === "error" && "text-red-600",
        variant === "warning" && "text-amber-700",
        className,
      )}
    >
      {children}
    </p>
  );
}
