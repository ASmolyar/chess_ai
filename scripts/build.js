/**
 * Build script for Vercel deployment
 * Copies static files to public directory
 */

import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

// Create public directory
mkdirSync(publicDir, { recursive: true });

// Helper to copy directory recursively
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Copy static files
const filesToCopy = [
  'index.html',
  'style.css',
  'favicon.svg'
];

for (const file of filesToCopy) {
  const src = join(rootDir, file);
  const dest = join(publicDir, file);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  }
}

// Copy JS directory
const jsDir = join(rootDir, 'js');
if (existsSync(jsDir)) {
  copyDir(jsDir, join(publicDir, 'js'));
  console.log('Copied: js/');
}

console.log('Build complete!');
