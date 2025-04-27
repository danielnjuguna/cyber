// api/uploadthing.js
import { ourFileRouter } from './core.js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to create a safe filename
function createSafeFilename(originalFilename) {
  // Get the file extension
  const ext = path.extname(originalFilename);
  
  // Get the base name without extension
  const baseName = path.basename(originalFilename, ext);
  
  // Replace problematic characters with underscores
  const safeBaseName = baseName
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace any character that's not alphanumeric, hyphen, or underscore
    .replace(/__+/g, '_'); // Replace multiple consecutive underscores with a single one
  
  // Add timestamp for uniqueness
  const timestamp = Date.now();
  
  // Return the sanitized filename with timestamp and original extension
  return `${safeBaseName}_${timestamp}${ext}`;
}

// Custom middleware for handling file uploads
export default async function handleUploadThingRequest(req, res) {
  try {
    // Get the endpoint from query parameters
    const endpoint = req.query.endpoint || 'documentUploader'; // Default to documentUploader
    
    console.log(`Processing upload request for endpoint: ${endpoint}`);
    
    // Check if the requested endpoint exists in our router
    if (!ourFileRouter[endpoint]) {
      return res.status(400).json({ 
        error: true, 
        message: `Invalid endpoint: ${endpoint}. Available endpoints: ${Object.keys(ourFileRouter).join(', ')}` 
      });
    }
    
    // Parse the multipart form data
    const form = formidable({ 
      multiples: true,
      maxFileSize: endpoint === 'imageUploader' ? 10 * 1024 * 1024 : 30 * 1024 * 1024, // 10MB for images, 30MB for docs
      keepExtensions: true,
      filename: (name, ext, part) => {
        const originalName = part.originalFilename || 'file';
        return createSafeFilename(originalName);
      }
    });
    
    // Parse the form
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });
    
    console.log('Files received:', files);
    
    // Extract files - handle both array and single file cases
    const fileArray = files.files ? 
      (Array.isArray(files.files) ? files.files : [files.files]) : [];
    
    if (fileArray.length === 0) {
      return res.status(400).json({ error: true, message: 'No files uploaded' });
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const results = [];
    
    // Process each file
    for (const file of fileArray) {
      // Get file information
      const filename = path.basename(file.filepath);
      const originalFilename = file.originalFilename || 'unknown';
      const filesize = file.size;
      
      // Move to permanent location
      const finalPath = path.join(uploadsDir, filename);
      await fs.promises.copyFile(file.filepath, finalPath);
      
      // Create public URL - this assumes your server serves '/uploads' as a static directory
      const publicUrl = `/uploads/${filename}`;
      
      // Create result compatible with UploadThing response format
      results.push({
        name: originalFilename,
        size: filesize,
        key: filename,
        url: publicUrl,
      });
      
      console.log(`Processed file: ${originalFilename} -> ${publicUrl} (Saved as: ${filename})`);
    }
    
    // Return all processed files
    return res.status(200).json(results);
    
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: true, 
      message: error.message || 'Internal server error during upload' 
    });
  }
} 