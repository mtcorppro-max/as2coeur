export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse">
      {/* En-tête patient */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-rose-200" />
        <div className="grid gap-2">
          <div className="h-6 w-40 rounded-xl bg-rose-100" />
          <div className="h-4 w-24 rounded bg-rose-100" />
        </div>
      </div>

      {/* Constantes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-rose-100 bg-white p-4">
            <div className="h-3 w-20 rounded bg-rose-100" />
            <div className="mt-2 h-7 w-16 rounded bg-rose-200" />
          </div>
        ))}
      </div>

      {/* Graphiques */}
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-rose-100 bg-white p-5">
          <div className="mb-3 h-5 w-32 rounded bg-rose-100" />
          <div className="h-48 rounded-xl bg-rose-50" />
        </div>
      ))}

      {/* Chat */}
      <div className="rounded-2xl border border-rose-100 bg-white p-5">
        <div className="mb-3 h-5 w-24 rounded bg-rose-100" />
        <div className="h-40 rounded-xl bg-rose-50" />
      </div>
    </div>
  );
}
