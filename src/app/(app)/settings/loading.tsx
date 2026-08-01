import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Card } from '../../../components/ui/Card';

export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Skeleton width={150} height={32} className="mb-2" />
        <Skeleton width={250} height={20} />
      </div>

      <div className="flex border-b border-[var(--border)] gap-4 pb-2">
        <Skeleton width={80} height={24} />
        <Skeleton width={100} height={24} />
        <Skeleton width={80} height={24} />
        <Skeleton width={70} height={24} />
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <Skeleton width={150} height={24} />
          <Card padding="md" className="max-w-2xl space-y-6">
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={48} />
            <Skeleton width={120} height={40} />
          </Card>
        </section>

        <section className="space-y-4">
          <Skeleton width={150} height={24} />
          <Card padding="md" className="max-w-2xl space-y-6">
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={48} />
            <Skeleton width={150} height={40} />
          </Card>
        </section>
      </div>
    </div>
  );
}
