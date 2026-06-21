
type DashboardHeaderProps = {
  title: string;
  description?: string;
};

export function DashboardHeader({
  title,
  description,
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-border/70 bg-background/95 px-6 py-5">
      <div className="flex items-start justify-between gap-6">
        <div className="">

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>

          {description ? (
            <p className="max-w-2xl text-sm leading-3 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}