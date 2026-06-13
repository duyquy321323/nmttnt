import { cn } from "@/lib/utils";

/** Bảng desktop — ẩn trên mobile/iPad dọc, cuộn ngang trên màn rộng. */
export function DataTableViewport({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("table-wrap hidden overflow-x-auto lg:block", className)}>
      {children}
    </div>
  );
}

/** Danh sách dạng card trên mobile và iPad. */
export function MobileDataList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-3 lg:hidden", className)}>{children}</div>;
}

export function MobileDataCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("card space-y-3 p-4", className)}>{children}</div>;
}

export function MobileDataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-text-faint">
        {label}
      </span>
      <div className="min-w-0 text-sm text-text">{children}</div>
    </div>
  );
}
