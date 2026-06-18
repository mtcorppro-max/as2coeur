export default function Loading() {
  return (
    <div className="grid gap-5 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-rose-100" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-rose-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-5 w-32 rounded bg-rose-100" />
            <div className="h-5 w-20 rounded-full bg-rose-200" />
          </div>
          <div className="mt-3 h-4 w-48 rounded bg-rose-50" />
        </div>
      ))}
    </div>
  );
}
