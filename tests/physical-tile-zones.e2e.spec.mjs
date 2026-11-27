import {test,expect} from '@playwright/test';
for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:932,height:430}]){
 test('audit reports pre-clip bounds and stays invariant under display zoom '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/physical-tile-lab.html');
  await expect(page.locator('#auditSummary')).toContainText('Проверено сторон: 8');
  const read=()=>page.locator('[data-preview-side]').evaluateAll(es=>es.map(e=>[e.dataset.auditIssues,e.dataset.auditOutside,e.dataset.auditUnmeasured]));
  const initial=await read();expect(initial.every(x=>x.every(v=>v!==undefined))).toBe(true);
  expect(initial.every(x=>x[2]==='0')).toBe(true);
  await page.locator('#zoom').selectOption('1');expect(await read()).toEqual(initial);
  await page.locator('#zoom').selectOption('1.5');expect(await read()).toEqual(initial);
  for(const calibration of [65,145,100]){
   await page.locator('#calibration').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},calibration);
   expect(await read()).toEqual(initial);
  }
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

test('reference viewport preserves glyph and nested stroke bounds and restores the actual SVG size',async({page})=>{
 await page.goto('/physical-tile-lab.html');
 const result=await page.evaluate(async()=>{
  const {measureTileBlocks}=await import('/physical-tile-zones.js');
  const ns='http://www.w3.org/2000/svg';
  const e=(tag,a={},t)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(a))n.setAttribute(k,v);if(t)n.textContent=t;return n;};
  const svg=e('svg',{viewBox:'0 0 50 50',width:200,height:200,style:'color: red; width: 201px; height: 201px;'});
  const root=e('g'),title=e('g',{'data-layout-block':'title','data-zone':'title'}),risk=e('g',{'data-layout-block':'risk','data-zone':'risk'});
  title.append(e('text',{x:25,y:8.7,'font-size':3.25,'font-family':'Arial, sans-serif','font-weight':'bold','text-anchor':'middle'},'Комиссионный'));
  const nested=e('svg',{x:5,y:20,width:5,height:5,viewBox:'0 0 100 100'});
  nested.append(e('rect',{x:0,y:0,width:100,height:100,stroke:'#000','stroke-width':20,'stroke-linejoin':'round'}));
  risk.append(nested);root.append(title,risk);svg.append(root);document.body.append(svg);
  const samples=[];
  for(const px of [201,378,283.5,123.25,548]){
   svg.style.width=px+'px';svg.style.height=px+'px';
   const before=svg.getAttribute('style'),rectBefore=svg.getBoundingClientRect();
   const blocks=measureTileBlocks(root),rectAfter=svg.getBoundingClientRect();
   samples.push({blocks,restored:svg.getAttribute('style')===before&&rectBefore.width===rectAfter.width&&rectBefore.height===rectAfter.height});
  }
  svg.removeAttribute('style');measureTileBlocks(root);
  const absentStyleRestored=!svg.hasAttribute('style')&&svg.getAttribute('style')===null&&svg.getBoundingClientRect().width===200;
  svg.setAttribute('style','');measureTileBlocks(root);
  const emptyStyleRestored=svg.hasAttribute('style')&&svg.getAttribute('style')===''&&svg.getBoundingClientRect().width===200;
  svg.setAttribute('style','width: 170px !important; height: 180px; color: red; --test-flag: 7;');
  const customBefore=svg.getAttribute('style'),customRect=svg.getBoundingClientRect();
  measureTileBlocks(root);
  const customStyleRestored=svg.getAttribute('style')===customBefore&&svg.getBoundingClientRect().width===customRect.width&&svg.getBoundingClientRect().height===customRect.height;
  return {samples,absentStyleRestored,emptyStyleRestored,customStyleRestored};
 });
 expect(result.absentStyleRestored).toBe(true);
 expect(result.emptyStyleRestored).toBe(true);
 expect(result.customStyleRestored).toBe(true);
 const baseline=result.samples[0].blocks;
 expect(baseline.every(b=>b.box&&b.box.w>0&&b.box.h>0)).toBe(true);
 expect(baseline.find(b=>b.id==='risk').box.w).toBeCloseTo(6,6);
 for(const sample of result.samples){
  expect(sample.restored).toBe(true);
  expect(sample.blocks.map(b=>b.id)).toEqual(baseline.map(b=>b.id));
  for(let i=0;i<baseline.length;i++)for(const k of ['x','y','w','h'])expect(sample.blocks[i].box[k]).toBeCloseTo(baseline[i].box[k],6);
 }
});
