import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  back = true,
  rightSlot,
  subtitle,
}: {
  title: string;
  back?: boolean;
  rightSlot?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-4 py-3">
        {back ? (
          <Link
            to="/"
            className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-tight">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {rightSlot}
      </div>
    </header>
  );
}
