export default function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-2">
            <div className="h-8 w-1/3 rounded bg-white/10" />
            <div className="h-5 w-full rounded bg-white/10" />
            <div className="h-5 w-11/12 rounded bg-white/10" />
            <div className="h-5 w-10/12 rounded bg-white/10" />
        </div>
    );
}
