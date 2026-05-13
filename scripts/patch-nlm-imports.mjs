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

      // Replace @/components/ with @/components/natureos/nlm-training/
      if (content.includes('@/components/')) {
        content = content.replace(/@\/components\//g, '@/components/natureos/nlm-training/');
        modified = true;
      }

      // Replace @/lib/ with @/lib/nlm/
      if (content.includes('@/lib/')) {
        content = content.replace(/@\/lib\//g, '@/lib/nlm/');
        modified = true;
      }

      // Replace @/hooks/ with @/hooks/nlm/
      if (content.includes('@/hooks/')) {
        content = content.replace(/@\/hooks\//g, '@/hooks/nlm/');
        modified = true;
      }

      // Quick fix for use-mobile import which is usually in @/hooks
      if (content.includes('@/hooks/nlm/use-mobile')) {
        // Just use the local one copied to hooks/nlm
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Patched imports: ${fullPath}`);
      }
    }
  }
}

processDir(componentsDir);
console.log('Import patching complete.');
