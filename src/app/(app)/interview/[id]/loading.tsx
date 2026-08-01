import React from 'react';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';

export default function SessionLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <Skeleton width="100%" height={36} className="mb-4" />
      
      <div className="flex items-center justify-between mb-6">
        <Skeleton width={150} height={28} />
        <Skeleton width={120} height={40} />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col items-center justify-center p-8">
          <Skeleton width={192} height={192} variant="circle" className="mb-8" />
          <Skeleton width="80%" height={24} className="mb-2" />
          <Skeleton width="60%" height={24} />
        </Card>
        
        <div className="flex flex-col gap-4">
          <Card className="flex-1 p-6">
            <div className="flex justify-between items-center mb-4">
              <Skeleton width={120} height={24} />
              <Skeleton width={80} height={24} />
            </div>
            <div className="space-y-2 mt-4">
              <Skeleton width="100%" height={16} />
              <Skeleton width="90%" height={16} />
              <Skeleton width="95%" height={16} />
              <Skeleton width="80%" height={16} />
            </div>
          </Card>
          
          <Card padding="md">
            <Skeleton width={100} height={20} className="mb-2" />
            <Skeleton width="100%" height={16} />
          </Card>
        </div>
      </div>
    </div>
  );
}
