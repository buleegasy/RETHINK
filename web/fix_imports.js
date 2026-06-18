const fs = require('fs');
const glob = require('glob'); // assuming not available, let's use raw fs

const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Fix ../hooks, ../store, ../types, ../api
      const newContent = content.replace(/from '\.\.\/(hooks|store|types|api|lib)/g, "from '../../$1");
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }

      // Fix specific component cross-imports
      // ReThinkLogo is in layout, if imported from chat
      if (fullPath.includes('/chat/')) {
        const newerContent = content.replace(/from '\.\/ReThinkLogo'/g, "from '../layout/ReThinkLogo'");
        if (newerContent !== content) {
          content = newerContent;
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', fullPath);
      }
    }
  }
}

processDir('/Users/chenhaoran/Documents/心理竞赛/web/src/components');
