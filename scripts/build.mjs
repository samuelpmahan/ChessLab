import {stripTypeScriptTypes} from 'node:module';
import {mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {createHash} from 'node:crypto';

function files(dir) {
  return readdirSync(dir, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))
    .flatMap(entry => entry.isDirectory() ? files(join(dir,entry.name)) : [join(dir,entry.name)]);
}
// Every domain, view and build input participates, so model-only changes also
// invalidate cached modules. No timestamps or git metadata in generated output.
const sources = files('src').filter(path=>path.endsWith('.ts') && path!=='src/tui.ts');
const web = files('web');
const hash = createHash('sha256');
for (const path of [...sources,...web,'scripts/build.mjs']) hash.update(path+'\0').update(readFileSync(path)).update('\0');
const version = hash.digest('hex');
rmSync('dist',{recursive:true,force:true});
mkdirSync('dist',{recursive:true});
for (const path of sources) {
  const target = join('dist',path.replace(/\.ts$/,'.js'));
  const source = stripTypeScriptTypes(readFileSync(path,'utf8'))
    .replace(/(from\s+['"][^'"]+)\.ts(['"])/g,'$1.js$2')
    .replace(/[\t ]+$/gm,'');
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,source);
}
cpSync('web','dist',{recursive:true});
for (const path of files('dist').filter(path=>path.endsWith('.js'))) {
  writeFileSync(path,readFileSync(path,'utf8')
    .replace(/(from\s+['"]\.[^'"]+\.js)(['"])/g,'$1?v='+version+'$2'));
}
writeFileSync('dist/index.html',readFileSync('web/index.html','utf8')
  .replaceAll('__COMMIT__',version.slice(0,7))
  .replace('./browser.js','./browser.js?v='+version));
writeFileSync('dist/.nojekyll','');
rmSync('site',{recursive:true,force:true});
cpSync('dist','site',{recursive:true});
writeFileSync('index.html',readFileSync('dist/index.html','utf8').replace('./browser.js','./site/browser.js'));
writeFileSync('.nojekyll','');
console.log('Built browser debugger '+version);
