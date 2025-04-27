import React, { createContext, useContext } from 'react';
import { UploadButton, UploadDropzone, Uploader } from "@uploadthing/react";

// Create a context for UploadThing
const UploadThingContext = createContext(null);

export function UploadThingProvider({ children }) {
  // Define your UploadThing configuration
  const uploadThingConfig = {
    // Add any configuration needed
  };

  return (
    <UploadThingContext.Provider value={uploadThingConfig}>
      {children}
    </UploadThingContext.Provider>
  );
}

// Custom hook to use the context
export function useUploadThing() {
  const context = useContext(UploadThingContext);
  if (context === null) {
    throw new Error('useUploadThing must be used within an UploadThingProvider');
  }
  return context;
}

// Export components from @uploadthing/react directly
export { UploadButton, UploadDropzone, Uploader }; 