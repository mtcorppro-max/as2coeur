export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse lg:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="h-8 w-56 rounded-xl bg-rose-100" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl border border-rose-100 bg-white" />
        ))}
      </div>
      <div className="rounded-2xl border border-rose-100 bg-white p-5">
        <div className="mb-3 h-5 w-40 rounded bg-rose-100" />
        <div className="h-40 rounded-xl bg-rose-50" />
      </div>
    </div>
  );
}
