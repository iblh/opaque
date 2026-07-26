// Minimal footer: just the copyright. The fake print colophon (doc/scale/page)
// was decorative pseudo-metadata and carried no information — removed.
export default function Footer() {
    return (
        <footer className="bg-[var(--page-bg)]">
            <div className="mx-auto flex max-w-[var(--shell-width)] items-center justify-end border-x border-t border-border-light bg-background px-8 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                © OPAQUE
            </div>
        </footer>
    )
}
