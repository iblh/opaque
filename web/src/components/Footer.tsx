// Document footer: a filed-sheet colophon — provenance + scale/ratio on the
// left, page number and © on the right, on one hairline rule. Mirrors the
// masthead so the dashboard reads as a bounded archived sheet.
export default function Footer() {
    return (
        <footer className="border-t border-border-light bg-surface-elevated">
            <div className="mx-6 flex items-center justify-between gap-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted tabular-nums sm:mx-8 lg:mx-12 xl:mx-16 2xl:mx-24">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="text-text-muted/70">Doc</span>
                        <span className="text-text-secondary">OPAQUE·DASH</span>
                    </span>
                    <span className="hidden items-center gap-1.5 sm:flex">
                        <span className="text-text-muted/70">Scale</span>
                        <span className="text-text-secondary">1:1</span>
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="text-text-muted/70">Page</span>
                        <span className="text-text-secondary">01 / 01</span>
                    </span>
                    <span className="text-text-tertiary">© OPAQUE</span>
                </div>
            </div>
        </footer>
    )
}
