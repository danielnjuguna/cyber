// check-env.js - Diagnostic script for Render deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('===============================================');
console.log('RENDER DEPLOYMENT DIAGNOSTIC SCRIPT');
console.log('===============================================');

// Check environment variables
console.log('\n== ENVIRONMENT VARIABLES ==');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`RENDER: ${process.env.RENDER}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`DB_HOST: ${process.env.DB_HOST}`);
console.log(`DB_SSL_REJECT_UNAUTHORIZED: ${process.env.DB_SSL_REJECT_UNAUTHORIZED}`);
console.log(`UPLOADTHING_APP_ID: ${process.env.UPLOADTHING_APP_ID}`);
console.log(`UPLOADTHING_SECRET: ${process.env.UPLOADTHING_SECRET ? 'Set (hidden)' : 'Not set'}`);
console.log(`RENDER_PROJECT_DIR: ${process.env.RENDER_PROJECT_DIR || 'Not set'}`);

// Check directory structure
console.log('\n== DIRECTORY STRUCTURE ==');
console.log(`Current directory (__dirname): ${__dirname}`);
console.log(`Process cwd: ${process.cwd()}`);

// Function to list files recursively
function listDir(dir, indent = '') {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        console.log(`${indent}[dir] ${item}/`);
        
        // Only go one level deep to avoid excessive output
        if (indent.length <= 2) {
          listDir(fullPath, indent + '  ');
        } else {
          console.log(`${indent}  ...`);
        }
      } else {
        console.log(`${indent}[file] ${item} (${stats.size} bytes)`);
      }
    });
  } catch (error) {
    console.error(`Error listing directory ${dir}:`, error.message);
  }
}

// List current directory structure
console.log('\n== CURRENT DIRECTORY STRUCTURE ==');
listDir(__dirname);

// Check if api directory exists
const apiDir = path.join(__dirname, 'api');
console.log(`\nDoes ./api exist? ${fs.existsSync(apiDir)}`);

// Check if src/api directory exists
const srcApiDir = path.join(__dirname, 'src', 'api');
console.log(`Does ./src/api exist? ${fs.existsSync(srcApiDir)}`);

// Check if dist/api directory exists
const distApiDir = path.join(__dirname, 'dist', 'api');
console.log(`Does ./dist/api exist? ${fs.existsSync(distApiDir)}`);

console.log('\n===============================================');
console.log('END OF DIAGNOSTIC SCRIPT');
console.log('==============================================='); 