export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-rose-100 bg-white p-4">
        <div className="mb-3 h-4 w-24 rounded bg-rose-100" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-2 h-10 rounded-xl bg-rose-50" />
        ))}
      </div>
      <div className="rounded-2xl border border-rose-100 bg-white p-5">
        <div className="h-40 rounded-xl bg-rose-50" />
      </div>
    </div>
  );
}
