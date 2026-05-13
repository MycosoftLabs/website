import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'components', 'natureos', 'nlm-training');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let modified = false;

      // Add 'use client' if it uses React hooks or UI
      if (fullPath.endsWith('.tsx') && !content.includes("'use client'") && !content.includes('"use client"')) {
        content = `'use client';\n\n` + content;
        modified = true;
      }

      // Replace motion/react with framer-motion
      if (content.includes('motion/react')) {
        content = content.replace(/['"]motion\/react['"]/g, "'framer-motion'");
        modified = true;
      }

      // The Vite app might import from '@/lib/...'.
      // Next.js uses '@/lib/...' too, but let's make sure the path exists later.

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Patched: ${fullPath}`);
      }
    }
  }
}

processDir(componentsDir);
console.log('Patching complete.');
