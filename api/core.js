import { createUploadthing } from "uploadthing/express";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Custom helper function for file deletion
export const deleteFile = async (fileKey) => {
  if (!fileKey) {
    console.warn('No file key provided for deletion');
    return { success: false, message: 'No file key provided' };
  }
  
  try {
    console.log(`🗃️ Using core deleteFile helper for key: ${fileKey}`);
    
    // Get UploadThing credentials
    const apiKey = process.env.UPLOADTHING_SECRET;
    
    if (!apiKey) {
      throw new Error('Missing UPLOADTHING_SECRET in environment variables');
    }
    
    // Fix for ZodError issue - make sure fileKey follows proper format
    let sanitizedKey = fileKey.trim();
    
    // Additional sanitization - some keys might have a URL format
    // Extract just the key part if it's a full URL
    if (sanitizedKey.startsWith('http')) {
      try {
        const urlParts = sanitizedKey.split('/');
        // The key is typically the last part of the URL
        sanitizedKey = urlParts[urlParts.length - 1];
        console.log(`Extracted key from URL: ${sanitizedKey}`);
      } catch (parseError) {
        console.warn(`Failed to parse URL format, using original key: ${sanitizedKey}`);
      }
    }
    
    console.log(`Using sanitized key for deletion: ${sanitizedKey}`);
    
    // According to UploadThing docs, we need to pass an array of keys in the 'fileKeys' property
    // This is the correct format expected by the API
    const response = await fetch(`https://uploadthing.com/api/deleteFiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-uploadthing-api-key': apiKey
      },
      body: JSON.stringify({ 
        fileKeys: [sanitizedKey]  // Pass as array in 'fileKeys' property
      })
    });
    
    // Get the response text first to ensure it's valid JSON
    const responseText = await response.text();
    let result;
    
    try {
      // Try to parse the JSON
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse UploadThing API response:', parseError);
      console.log('Raw response text:', responseText);
      // Return a default error result
      result = { 
        error: true, 
        message: 'Invalid response from UploadThing API', 
        rawResponse: responseText 
      };
    }
    
    console.log(`UploadThing direct API deletion result:`, result);
    
    // If the response has a success field directly, use that
    if (result && result.success) {
      return { success: true, message: 'File deleted successfully', key: sanitizedKey };
    } 
    
    // Check for common success patterns in the response
    if (response.ok || (result && result.message && (
      result.message.includes('successfully') ||
      result.message.includes('deleted') ||
      result.message.includes('removed')
    ))) {
      return { success: true, message: 'File deleted successfully', key: sanitizedKey };
    }
    
    // Check if the file doesn't exist (which we can consider "successfully deleted")
    if (result && result.message && (
      result.message.includes('not found') ||
      result.message.includes('does not exist')
    )) {
      return { success: true, message: 'File does not exist or was already deleted', key: sanitizedKey };
    }
    
    // All other cases are considered failures
    return { 
      success: false, 
      message: result?.message || 'Failed to delete file', 
      key: sanitizedKey,
      statusCode: response.status,
      details: result
    };
  } catch (error) {
    console.error('Error in deleteFile helper:', error);
    return { 
      success: false, 
      message: 'Error in deleteFile helper', 
      error: error.message,
      key: fileKey
    };
  }
};

// Enhanced FileRouter with better error handling and logging
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique route slug
  imageUploader: f({ image: { maxFileSize: "10MB", maxFileCount: 1 } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req, res }) => {
      // This code runs on your server before upload
      console.log("⬆️ Image upload started, processing middleware...");
      
      try {
        // For a production app, you would check authentication here
        // For example: const user = await auth(req, res);
        // if (!user) throw new UploadThingError("Unauthorized");
        
        // For now, we'll return a dummy userId
        // Replace this with your actual user authentication logic if needed
        const userId = "fakeUserId"; // Or extract from JWT token in a real app

        console.log(`⬆️ Upload middleware authorized for user: ${userId}`);
        // Whatever is returned here is accessible in onUploadComplete as `metadata`
        return { userId };
      } catch (error) {
        console.error("⚠️ Upload middleware error:", error);
        throw new UploadThingError(error.message || "Unauthorized");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      try {
        console.log("🎉 Upload success for userId:", metadata.userId);
        console.log("📄 File URL:", file.url);
        console.log("🔑 File key:", file.key);

        // Here you might want to save the file info to your database
        // For example: await db.insert({ userId: metadata.userId, fileUrl: file.url, fileKey: file.key });

        // Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
        return { 
          uploadedBy: metadata.userId, 
          url: file.url, 
          key: file.key,
          name: file.name,
          size: file.size
        };
      } catch (error) {
        console.error("⚠️ Error in onUploadComplete:", error);
        throw new UploadThingError("Failed to process upload");
      }
    }),
    
  documentUploader: f({ 
      // Accept a wider range of file types for documents
      pdf: { maxFileSize: "30MB", maxFileCount: 1 },
      image: { maxFileSize: "10MB", maxFileCount: 1 },
      text: { maxFileSize: "10MB", maxFileCount: 1 },
      // Allow common document formats
      "application/msword": { maxFileSize: "30MB", maxFileCount: 1 }, // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "30MB", maxFileCount: 1 }, // .docx
      "application/vnd.ms-excel": { maxFileSize: "30MB", maxFileCount: 1 }, // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { maxFileSize: "30MB", maxFileCount: 1 }, // .xlsx
      "application/vnd.ms-powerpoint": { maxFileSize: "30MB", maxFileCount: 1 }, // .ppt
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": { maxFileSize: "30MB", maxFileCount: 1 }, // .pptx
      "text/csv": { maxFileSize: "10MB", maxFileCount: 1 }, // .csv
      // Generic blob as fallback, adjust size if needed
      blob: { maxFileSize: "30MB", maxFileCount: 1 }, 
    })
    .middleware(async ({ req, res }) => {
      console.log("⬆️ Document upload started, processing middleware...");
      
      try {
        // Replace with actual user auth if needed
        const userId = "fakeUserId"; 
        
        console.log(`⬆️ Upload middleware authorized for user: ${userId}`);
        return { userId };
      } catch (error) {
        console.error("⚠️ Upload middleware error:", error);
        throw new UploadThingError(error.message || "Unauthorized");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        console.log("🎉 Document Upload complete for userId:", metadata.userId);
        console.log("📄 File URL:", file.url);
        console.log("🔑 File key:", file.key);
        console.log("📛 File name:", file.name);
        console.log("📐 File size:", file.size);

        // Determine file type from the original filename extension
        const fileName = file.name || '';
        const fileType = fileName.split('.').pop()?.toLowerCase() || 'blob'; // Default to blob if no extension
        console.log("📄 Determined File Type:", fileType);
        
        // Return file type in metadata
        return { 
          uploadedBy: metadata.userId, 
          url: file.url, 
          key: file.key,
          name: file.name,
          size: file.size,
          type: fileType // Add the determined file type
        };
      } catch (error) {
        console.error("⚠️ Error in onUploadComplete:", error);
        throw new UploadThingError("Failed to process document upload");
      }
    }),
};

export const OurFileRouter = ourFileRouter; // Ensure type export if needed elsewhere, depends on TS setup or usage patterns 