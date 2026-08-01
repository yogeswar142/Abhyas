import React from 'react';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';

export default function NewInterviewLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div>
        <Skeleton width={200} height={32} className="mb-2" />
        <Skeleton width={300} height={20} />
      </div>

      <section className="space-y-4">
        <Skeleton width={150} height={28} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} padding="md">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton width={32} height={32} variant="rect" />
                <Skeleton width={100} height={24} />
              </div>
              <Skeleton width="100%" height={16} className="mb-1" />
              <Skeleton width="80%" height={16} />
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton width={150} height={28} />
        <Card padding="md" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
        </Card>
      </section>
    </div>
  );
}
