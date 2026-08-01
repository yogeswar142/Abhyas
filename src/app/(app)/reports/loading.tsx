import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Card } from '../../../components/ui/Card';

export default function ReportsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton width={200} height={32} className="mb-2" />
        <Skeleton width={300} height={20} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} padding="md">
            <Skeleton width={100} height={20} className="mb-2" />
            <Skeleton width={60} height={32} />
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton width={60} height={32} />
          <Skeleton width={80} height={32} />
          <Skeleton width={80} height={32} />
        </div>

        <Card padding="none">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-1)]">
            <Skeleton width="100%" height={20} />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 flex items-center justify-between">
                <Skeleton width={200} height={40} />
                <Skeleton width={100} height={40} />
                <Skeleton width={150} height={20} />
                <Skeleton width={80} height={24} className="rounded-full" />
                <Skeleton width={60} height={32} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
