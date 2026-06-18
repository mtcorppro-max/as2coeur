export default function Loading() {
  return (
    <div className="grid gap-4 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-rose-100" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-10 w-10 shrink-0 rounded-full bg-rose-100" />
          <div className="flex-1 grid gap-2">
            <div className="h-4 w-40 rounded bg-rose-100" />
            <div className="h-3 w-full rounded bg-rose-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
