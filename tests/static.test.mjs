import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('app.js has no querySelector(...).forEach regression',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const bad=app.split('\n').map((line,i)=>({line:i+1,text:line.trim()})).filter(x=>/(^|[^$])\$\([^)]*\)\.forEach/.test(x.text));
  assert.deepEqual(bad,[]);
});

test('browser entrypoints and displayed version are in sync',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/Prototype v0\\.28\\.5/);
  assert.match(html,/app\\.js\\?v=0285/);
  assert.match(html,/styles\\.css\\?v=0285/);
});

test('Delivery UI contains all progressive flow handlers',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  for(const needle of [
    "deliveryDraft.step='load'",
    "$$('[data-hauler]').forEach",
    "$$('[data-load]').forEach",
    "$$('[data-route-next]').forEach",
    "$$('[data-drop-type]').forEach",
    "$('#deliveryConfirm')?.addEventListener('click',confirmDelivery)",
    "el.className='delivery-panel active'"
  ]) assert.ok(app.includes(needle),needle);
});
