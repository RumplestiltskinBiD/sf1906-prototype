import {test,expect} from '@playwright/test';
for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:932,height:430}]){
 test('audit reports pre-clip bounds and stays invariant under display zoom '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/physical-tile-lab.html');
  await expect(page.locator('#auditSummary')).toContainText('Проверено сторон: 8');
  const read=()=>page.locator('[data-preview-side]').evaluateAll(es=>es.map(e=>[e.dataset.auditIssues,e.dataset.auditOutside,e.dataset.auditUnmeasured]));
  const initial=await read();expect(initial.every(x=>x.every(v=>v!==undefined))).toBe(true);
  expect(initial.every(x=>x[2]==='0')).toBe(true);
  await page.locator('#zoom').selectOption('1');expect(await read()).toEqual(initial);
  await page.locator('#auditOverlay').check();await expect(page.locator('[data-safe-polygon]')).toHaveCount(8);
  await page.locator('#filled').check();await expect(page.locator('#auditSummary')).toContainText('Проверено сторон: 8');
  await page.locator('#compare').check();await expect(page.locator('[data-safe-polygon]')).toHaveCount(32);
  expect((await read()).every(x=>x[2]==='0')).toBe(true);
  await page.emulateMedia({media:'print'});await expect(page.locator('.audit-overlay').first()).toBeHidden();
 });
}
test('browser audit catches actual clipped text, scaled nested SVG stroke and accidental overlap',async({page})=>{
 await page.goto('/physical-tile-lab.html');
 const result=await page.evaluate(async()=>{
  const {measureTileBlocks,auditTileBlocks}=await import('/physical-tile-zones.js');
  const ns='http://www.w3.org/2000/svg';
  const e=(tag,a={},t)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(a))n.setAttribute(k,v);if(t)n.textContent=t;return n;};
  const svg=e('svg',{viewBox:'0 0 50 50',width:200,height:200}),root=e('g',{'clip-path':'url(#fixture-clip)'});
  const clip=e('clipPath',{id:'fixture-clip'});clip.append(e('rect',{x:5,y:5,width:40,height:40}));svg.append(clip,root);document.body.append(svg);
  const block=(id,zone,child)=>{const g=e('g',{'data-layout-block':id,'data-zone':zone});g.append(child);root.append(g)};
  block('bad-text','title',e('text',{x:1,y:25,'font-size':4,'text-anchor':'end'},'За контуром'));
  const icon=e('svg',{x:5,y:20,width:5,height:5,viewBox:'0 0 100 100'});
  icon.append(e('rect',{x:0,y:0,width:100,height:100,stroke:'#000','stroke-width':20,'stroke-linejoin':'round'}));
  block('nested','risk',icon);
  block('collision','storage',e('rect',{x:7,y:22,width:8,height:8}));
  const blocks=measureTileBlocks(root),a=auditTileBlocks(blocks,{diameter:50,side:'back',margin:1.5});
  return {issues:a.issues,blocks};
 });
 expect(result.blocks.every(b=>b.box!==null),JSON.stringify(result)).toBe(true);
 expect(result.issues.some(i=>i.type==='unmeasured')).toBe(false);
 expect(result.issues.some(i=>i.type==='outside'&&i.ids.includes('bad-text'))).toBe(true);
 expect(result.issues.some(i=>i.type==='overlap'&&i.ids.includes('nested')&&i.ids.includes('collision'))).toBe(true);
 expect(result.blocks.find(b=>b.id==='nested').box.w).toBeCloseTo(6,2);
});
