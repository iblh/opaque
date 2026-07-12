// Minimal footer: just the copyright. The fake print colophon (doc/scale/page)
// was decorative pseudo-metadata and carried no information — removed.
export default function Footer() {
    return (
        <footer className="border-t border-border-light bg-surface-elevated">
            <div className="mx-6 flex items-center justify-end py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary sm:mx-8 lg:mx-12 xl:mx-16 2xl:mx-24">
                © OPAQUE
            </div>
        </footer>
    )
}
