import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,readFile,rm,rename } from 'node:fs/promises';
import path from 'node:path';
import { replaceArchive } from '../../scripts/update-local.mjs';

test('updater: a temporary Windows lock is retried without deleting the installed version',async()=>{
  const folder=await mkdtemp(path.resolve('qa/update-'));
  try {
    const installed=path.join(folder,'app.asar'),next=installed+'.next';
    await writeFile(installed,'old');await writeFile(next,'new');let calls=0,waits=0;
    await replaceArchive(next,installed,{wait:async()=>{waits++;assert.equal(await readFile(installed,'utf8'),'old');},move:async(a,b)=>{
      if(++calls<3)throw Object.assign(new Error('locked'),{code:'EPERM'});
      await rename(a,b);
    }});
    assert.equal(calls,3);assert.equal(waits,2);assert.equal(await readFile(installed,'utf8'),'new');
  }finally{await rm(folder,{recursive:true,force:true});}
});

test('updater: persistent denial preserves both archives and gives recovery instructions',async()=>{
  const folder=await mkdtemp(path.resolve('qa/update-'));
  try {
    const installed=path.join(folder,'app.asar'),next=installed+'.next';
    await writeFile(installed,'old');await writeFile(next,'new');let calls=0;
    await assert.rejects(replaceArchive(next,installed,{attempts:3,wait:async()=>{},move:async()=>{calls++;throw Object.assign(new Error('denied'),{code:'EPERM'});}}),/Reinicia Windows/);
    assert.equal(calls,3);assert.equal(await readFile(installed,'utf8'),'old');assert.equal(await readFile(next,'utf8'),'new');
  }finally{await rm(folder,{recursive:true,force:true});}
});

test('updater: unrelated filesystem errors are reported immediately',async()=>{
  let calls=0;
  await assert.rejects(replaceArchive('unused.next','unused',{move:async()=>{calls++;throw Object.assign(new Error('missing'),{code:'ENOENT'});},wait:async()=>assert.fail('must not retry')}),{code:'ENOENT'});
  assert.equal(calls,1);
});


test('updater: bounded waiting reports a lock and installs when it is released',async()=>{
 const folder=await mkdtemp(path.resolve('qa/update-'));
 try{
  const installed=path.join(folder,'app.asar'),next=installed+'.next';await writeFile(installed,'old');await writeFile(next,'new');
  const reports=[];let attempts=0,waits=0;
  await replaceArchive(next,installed,{attempts:241,onLocked:info=>reports.push(info),wait:async(ms)=>{assert.equal(ms,500);waits++;assert.equal(await readFile(installed,'utf8'),'old');},move:async(a,b)=>{if(++attempts<=12)throw Object.assign(new Error('busy'),{code:'EPERM'});await rename(a,b);}});
  assert.equal(waits,12);assert.equal(reports.length,12);assert.equal(reports[0].attempts,241);assert.equal(await readFile(installed,'utf8'),'new');
 }finally{await rm(folder,{recursive:true,force:true});}
});
