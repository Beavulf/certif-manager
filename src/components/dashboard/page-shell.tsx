type PageShellProps = {
  children: React.ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}