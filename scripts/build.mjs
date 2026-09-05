import {stripTypeScriptTypes} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync,cpSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist/src/lab',{recursive:true});
for(const path of ['lab/host','chess/cartridge','chess/stages/S0/clean/index','state','famousGame','replayView','lab/replay','views','lab/debugMaterializer','lab/board','lab/contract','lab/sha256']){let source=stripTypeScriptTypes(readFileSync('src/'+path+'.ts','utf8'));source=source.replace(/(from\s+['"][^'"]+)\.ts(['"])/g,'$1.js$2');mkdirSync('dist/src/'+path.split('/').slice(0,-1).join('/'),{recursive:true});writeFileSync('dist/src/'+path+'.js',source);}
cpSync('web/browser.js','dist/browser.js');
const sha=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
writeFileSync('dist/index.html',readFileSync('web/index.html','utf8').replace('__COMMIT__',sha.slice(0,7)));
writeFileSync('dist/.nojekyll','');
console.log('Built browser terminal for '+sha);
