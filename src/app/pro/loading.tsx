export default function Loading() {
  return (
    <div className="grid gap-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-xl bg-rose-100" />
        <div className="h-6 w-32 rounded-full bg-rose-200" />
      </div>
      <div className="rounded-2xl border border-rose-100 bg-white overflow-hidden">
        <div className="h-10 bg-rose-50" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-rose-50 px-4 py-4">
            <div className="h-5 w-32 rounded bg-rose-100" />
            <div className="h-5 w-16 rounded-full bg-rose-100" />
            <div className="h-5 w-20 rounded-full bg-rose-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
