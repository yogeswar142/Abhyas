export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6 pb-16">
      {/* Eyebrow + title */}
      <div className="border-b border-[var(--v-border)] pb-6 space-y-2">
        <div className="h-2.5 w-24 rounded-full bg-[var(--v-raised)]" />
        <div className="h-9 w-52 rounded-lg bg-[var(--v-raised)]" />
        <div className="h-2.5 w-72 rounded-full bg-[var(--v-raised)]" />
      </div>

      {/* Profile header card */}
      <div className="h-24 rounded-xl bg-[var(--v-raised)] border border-[var(--v-border)]" />

      {/* Stats 2×2 grid */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-24 rounded-xl bg-[var(--v-raised)] border border-[var(--v-border)]"
          />
        ))}
      </div>

      {/* Goals + Milestones two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target goals */}
        <div className="space-y-3">
          <div className="h-3 w-36 rounded-full bg-[var(--v-raised)]" />
          <div className="h-28 rounded-xl bg-[var(--v-raised)] border border-[var(--v-border)]" />
        </div>

        {/* Milestones */}
        <div className="space-y-3">
          <div className="h-3 w-40 rounded-full bg-[var(--v-raised)]" />
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--v-raised)] border border-[var(--v-border)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
