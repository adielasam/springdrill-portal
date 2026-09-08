const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  content = content.replace(/window\.location\.href\s*=\s*'login'/g, "window.location.href = '/'");
  content = content.replace(/window\.location\.href\s*=\s*"login"/g, "window.location.href = '/'");
  content = content.replace(/window\.location\.href\s*=\s*'\/login'/g, "window.location.href = '/'");
  content = content.replace(/window\.location\.href\s*=\s*"\/login"/g, "window.location.href = '/'");
  if (content !== original) {
    fs.writeFileSync(filePath, content);
  }
});
console.log('Done');
