import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';
import { scanRepository } from './lib/secret-scanner-engine.mjs';
const root=resolve(process.argv[2]||'.'),out=join(root,'evidence/runs/task2-secret-scanner');mkdirSync(out,{recursive:true});
const dir=join(root,'evidence/g1-suite-v1.0');
function files(p){return readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(join(p,x.name)):[join(p,x.name)]);}
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=Object.fromEntries(readFileSync(join(root,'evidence/g1-suite-v1.0.SHA256SUMS'),'utf8').trim().split(/\r?\n/).map(x=>[x.slice(68),x.slice(0,64)]));
const actual=Object.fromEntries(files(dir).map(p=>[relative(dir,p).replaceAll('\\','/'),sha(readFileSync(p))]));
const ok=Object.keys(actual).length===18&&Object.keys(manifest).length===18&&Object.entries(actual).every(([p,h])=>manifest[p]===h);
const before=spawnSync('git',['-C',root,'ls-files','--stage','-z'],{encoding:null});
const report=scanRepository({repo:root,mode:'all-index'});
const after=spawnSync('git',['-C',root,'ls-files','--stage','-z'],{encoding:null});
const indexUnchanged=before.status===0&&after.status===0&&before.stdout.equals(after.stdout);
const summary={status:ok&&indexUnchanged&&report.status==='PASS'?'PASS':'FAIL',platform:process.platform,node:process.version,source_commit:process.env.GITHUB_SHA||null,source_ref:process.env.GITHUB_REF_NAME||null,frozen_files:18,frozen_match:ok,hashes:actual,index_entries_unchanged:indexUnchanged,repository_scan:report};
writeFileSync(join(out,`integrity-${process.platform}.json`),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));process.exitCode=summary.status==='PASS'?0:1;
