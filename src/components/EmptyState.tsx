export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h3 className="text-sm font-semibold">{title}</h3>
            {hint && <p className="mt-2 text-xs text-text-muted">{hint}</p>}
        </div>
    );
}
