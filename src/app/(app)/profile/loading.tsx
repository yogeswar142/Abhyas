import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Card } from '../../../components/ui/Card';

export default function ProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card padding="lg" className="relative h-64 flex items-end">
        <div className="flex items-end gap-6 w-full">
          <Skeleton width={128} height={128} variant="circle" />
          <div className="flex-1">
            <Skeleton width={200} height={32} className="mb-2" />
            <Skeleton width={150} height={20} />
          </div>
          <Skeleton width={100} height={40} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} padding="md">
            <Skeleton width={100} height={20} className="mb-2" />
            <Skeleton width={60} height={36} />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton width={150} height={28} />
            <Skeleton width={60} height={32} />
          </div>
          <Card padding="md">
            <Skeleton width="100%" height={120} />
          </Card>
        </div>
        <div className="space-y-4">
          <Skeleton width={180} height={28} />
          <Card padding="md" className="space-y-4">
            <Skeleton width="100%" height={80} />
            <Skeleton width="100%" height={80} />
            <Skeleton width="100%" height={80} />
          </Card>
        </div>
      </div>
    </div>
  );
}
