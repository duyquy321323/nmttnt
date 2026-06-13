import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isFile = type === "file";

    return (
      <input
        type={type}
        className={cn(
          "w-full rounded-xl border border-border bg-background text-sm text-foreground shadow-sm transition-colors",
          isFile
            ? "flex min-h-10 cursor-pointer items-center px-3 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground file:leading-normal hover:file:bg-brand-hover"
            : "flex h-10 px-3.5 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/40",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
