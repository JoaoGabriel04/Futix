export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center px-[var(--space-lg)]">
      {children}
    </div>
  );
}
