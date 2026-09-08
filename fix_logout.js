const fs = require('fs');
const glob = require('glob');
const files = glob.sync('public/*.html');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  content = content.replace(/window\.location\.href\s*=\s*'login'/g, "window.location.href = '/'");
  content = content.replace(/window\.location\.href\s*=\s*"login"/g, "window.location.href = '/'");
  content = content.replace(/window\.location\.href\s*=\s*'\/login'/g, "window.location.href = '/'");
  content = content.replace(/window\.location\.href\s*=\s*"\/login"/g, "window.location.href = '/'");
  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
console.log('Done');
