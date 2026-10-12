import { spawnSync } from 'node:child_process';
import { existsSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
const repo=resolve(process.argv[2]||'.');
function git(args){const p=spawnSync('git',['-C',repo,...args],{encoding:'utf8'});return p;}
const old=git(['config','--local','--get','core.hooksPath']);
const effective=git(['config','--get','core.hooksPath']);
if(effective.status!==0&&effective.status!==1 || effective.status===0&&effective.stdout.trim()!=='.githooks') {console.error('BLOCKED: effective hooksPath already configured; nothing changed.');process.exit(2);}
if(old.status!==0&&old.status!==1 || old.status===0&&old.stdout.trim()!=='.githooks') {console.error('BLOCKED: an existing hooksPath must be reviewed; nothing changed.');process.exit(2);}
if(old.status===1&&effective.status===1) { const h=git(['rev-parse','--git-path','hooks/pre-commit']); if(h.status!==0 || existsSync(resolve(repo,h.stdout.trim()))) {console.error('BLOCKED: an existing native hook must be reviewed; nothing changed.');process.exit(2);} }
if(!existsSync(resolve(repo,'.githooks/pre-commit'))||!existsSync(resolve(repo,'tools/secret-scanner.mjs'))) {console.error('BLOCKED: hook/scanner missing.');process.exit(2);}
if(process.platform!=='win32')chmodSync(resolve(repo,'.githooks/pre-commit'),0o755);
const r=git(['config','--local','core.hooksPath','.githooks']);
if(r.status!==0){console.error('BLOCKED: local hook installation failed.');process.exit(2);}
console.log('PASS: repository-local pre-commit hook installed.');
