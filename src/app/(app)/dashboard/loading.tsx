import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Card } from '../../../components/ui/Card';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton width={200} height={32} className="mb-2" />
          <Skeleton width={300} height={20} />
        </div>
        <Skeleton width={140} height={40} variant="rect" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding="md">
            <Skeleton width={100} height={20} className="mb-2" />
            <Skeleton width={60} height={32} className="mb-2" />
            <Skeleton width={80} height={16} />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton width={150} height={28} />
          <Card padding="none">
            <div className="divide-y divide-[var(--border)]">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton width={80} height={24} variant="rect" className="rounded-full" />
                    <div>
                      <Skeleton width={180} height={20} className="mb-1" />
                      <Skeleton width={120} height={16} />
                    </div>
                  </div>
                  <Skeleton width={60} height={20} />
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        <div className="space-y-4">
          <Skeleton width={150} height={28} />
          <Card padding="md" className="space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <Skeleton width={80} height={20} />
                  <Skeleton width={40} height={20} />
                </div>
                <Skeleton width="100%" height={8} className="rounded-full" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
