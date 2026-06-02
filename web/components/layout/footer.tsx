export function Footer() {
  return (
    <footer className="mt-8 border-t border-[var(--border)] bg-bg-page">
      <div className="container flex items-center justify-center gap-6 py-6 text-xs text-text-tertiary">
        <a href="#" className="hover:text-text-secondary transition-colors">Docs</a>
        <a href="#" className="hover:text-text-secondary transition-colors">GitHub</a>
        <a href="#" className="hover:text-text-secondary transition-colors">Governance</a>
        <a href="#" className="hover:text-text-secondary transition-colors">Security</a>
        <a href="#" className="hover:text-text-secondary transition-colors">Discord</a>
      </div>
    </footer>
  );
}
