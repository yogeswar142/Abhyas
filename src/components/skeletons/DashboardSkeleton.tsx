export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 pb-16">
      {/* Page header */}
      <div className="border-b border-[var(--v-border)] pb-6 flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-2.5 w-32 rounded-full bg-[var(--v-raised)]" />
          <div className="h-9 w-64 rounded-lg bg-[var(--v-raised)]" />
          <div className="h-2.5 w-48 rounded-full bg-[var(--v-raised)]" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-[var(--v-raised)] shrink-0" />
      </div>

      {/* Two-column skeleton */}
      <div className="flex gap-6 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Hero card */}
          <div className="h-44 rounded-2xl bg-[var(--v-raised)] border border-[var(--v-border)]" />
          {/* Readiness panel */}
          <div className="h-36 rounded-xl bg-[var(--v-raised)] border border-[var(--v-border)]" />
          {/* Timeline header */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-44 rounded-full bg-[var(--v-raised)]" />
            <div className="h-3 w-24 rounded-full bg-[var(--v-raised)]" />
          </div>
          {/* Timeline rows */}
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-14 rounded-lg bg-[var(--v-raised)] border border-[var(--v-border)]"
            />
          ))}
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 space-y-4 hidden lg:block">
          {/* Criteria card */}
          <div className="rounded-xl bg-[var(--v-raised)] border border-[var(--v-border)] p-4 space-y-3">
            <div className="h-2.5 w-28 rounded-full bg-[var(--v-float)]" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-2 w-16 rounded-full bg-[var(--v-float)]" />
                  <div className="h-2 w-8 rounded-full bg-[var(--v-float)]" />
                </div>
                <div className="h-1 rounded-full bg-[var(--v-float)]" />
              </div>
            ))}
          </div>
          {/* Soundstage dock */}
          <div className="rounded-xl bg-[var(--v-raised)] border border-[var(--v-border)] p-4 space-y-3">
            <div className="h-2.5 w-24 rounded-full bg-[var(--v-float)]" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-lg bg-[var(--v-float)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
