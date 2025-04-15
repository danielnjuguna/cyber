import React from 'react';
import { Spinner } from './Spinner';

const PageLoader = () => {
  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-2 text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
};

export default PageLoader; 