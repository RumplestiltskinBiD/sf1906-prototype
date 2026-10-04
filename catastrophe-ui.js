import {DISTRICTS} from './game-core.js';
import {DISTRICT_IDS,CENTERS,indicator,riskValue,fromGame,preset,begin,next,stats,formatReport} from './catastrophe-core.js';
const $=id=>document.getElementById(id);
const known=new Map(DISTRICTS.map(d=>[d.id,d]));
const savedKey='sf1906_phase1_ui_v030a';
const name=id=>known.get(id)?.name||id;
let values=preset('three'),sim=null,selection='soma',playing=false,svg=null,labels=null;
let scenarioLabel='3 очага: SoMa, Mission, Chinatown';
const format=r=>{const x=indicator(r);return x.raw>3?'III('+x.raw+')':String(x.raw);};
const safeText=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function draw(){
  if(svg){
    svg.querySelectorAll('[data-district]').forEach(g=>{
      const id=g.dataset.district,n=sim?.nodes[id];
      g.classList.toggle('is-selected',id===selection);
      g.classList.toggle('is-damaged',n?.quake==='damaged');
      g.classList.toggle('is-destroyed',n?.quake==='destroyed');
      g.classList.toggle('is-burning',!!n?.burning&&n?.quake!=='destroyed');
    });
    labels.replaceChildren();
    for(const id of DISTRICT_IDS){
      const [x,y]=CENTERS[id],n=sim?.nodes[id],r=values[id];
      const t=document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('x',String(x));t.setAttribute('y',String(y));
      t.setAttribute('text-anchor','middle');t.setAttribute('class','district-name');
      const title=document.createElementNS('http://www.w3.org/2000/svg','tspan');
      title.textContent=(n?.burning?'●':n?.quake==='damaged'?'!':'')+' '+(name(id).length>15?name(id).replace('Western Addition','Western').replace('Pacific Heights','Pacific').replace('Inner Richmond','I.Richmond').replace('Outer Richmond','O.Richmond'):name(id));
      title.setAttribute('x',String(x));
      const risk=document.createElementNS('http://www.w3.org/2000/svg','tspan');
      risk.setAttribute('x',String(x));risk.setAttribute('dy','20');risk.setAttribute('class','district-risk');
      risk.textContent='З'+format(n?.z??r.z)+' П'+format(n?.p??r.p);
      t.append(title,risk);labels.append(t);
    }
  }
  const st=sim?stats(sim):null;
  $('stats').innerHTML=[
    ['Целые',st?.intact??'—'],['Повреждены',st?.damaged??'—'],
    ['Разрушены З',st?.destroyed??'—'],['Все очаги',st?.burning??'—']
  ].map(([label,count])=>'<div><b>'+count+'</b><small>'+label+'</small></div>').join('');
  $('selectedTitle').textContent=name(selection);
  $('z').value=values[selection].z;$('p').value=values[selection].p;
  const n=sim?.nodes[selection];
  $('selectionInfo').textContent=n
    ?'З'+n.z+'; П'+n.baseP+' → '+n.p+'; землетрясение: '+({intact:'цел',damaged:'повреждён',destroyed:'разрушен'}[n.quake])
       +(n.burning?'; горит':'')+'. От соседей: '+(n.received.map(c=>name(c.source)+' +'+c.amount).join(', ')||'нет')
    :'Полные значения: З'+values[selection].z+', П'+values[selection].p+'. На карте III — только индикатор.';
  for(const id of ['z','p','zminus','zplus','pminus','pplus','quake','preset','loadSaved','igniteAt','spreadBy'])$(id).disabled=playing||!!sim;
  $('step').disabled=playing||!sim||sim.done;
  $('all').disabled=playing||!sim||sim.done;
  $('reset').disabled=playing;
  $('queue').textContent=sim
    ?'Очаги землетрясения: '+(sim.starts.map(name).join(', ')||'нет')+'. В очереди: '+(sim.queue.map(name).join(' → ')||'пусто')+'. Обработано: '+sim.events.length+'.'
    :'Сначала запустите землетрясение.';
}
async function loadMap(){
  try{
    // Exact locked geometry; no duplicate hand-drawn paths.
    const res=await fetch('./index.html',{cache:'no-cache'});
    if(!res.ok)throw Error('Не удалось открыть карту.');
    const html=new DOMParser().parseFromString(await res.text(),'text/html');
    const source=html.querySelector('svg.city-board.full-sf-map');
    if(!source)throw Error('Не найден SVG районов в основной игре.');
    svg=document.importNode(source,true);
    for(const layer of ['districtMetaLayer','supplyNodeLayer','deliveryRouteLayer','constructionLayer','workerLayer'])
      svg.querySelector('#'+layer)?.remove();
    svg.querySelector('#devMapImage')?.setAttribute('href','./assets/v8-map.webp?v=028');
    labels=document.createElementNS('http://www.w3.org/2000/svg','g');
    labels.setAttribute('id','laboratoryLabels');svg.append(labels);
    svg.querySelectorAll('[data-district]').forEach(g=>g.addEventListener('click',()=>{
      if(!DISTRICT_IDS.includes(g.dataset.district))return;
      selection=g.dataset.district;draw();
    }));
    $('mapWindow').replaceChildren(svg);
    draw();
  }catch(err){$('mapWindow').textContent='Карта не загрузилась: '+err.message; $('message').textContent='Не удалось подключить геометрию основной игры.';}
}
function setRisk(k,val){if(sim||playing)return;values[selection][k]=riskValue(val);draw();}
for(const [id,key,delta] of [['zminus','z',-1],['zplus','z',1],['pminus','p',-1],['pplus','p',1]]){
  $(id).addEventListener('click',()=>setRisk(key,values[selection][key]+delta));
}
$('z').addEventListener('change',()=>setRisk('z',$('z').value));
$('p').addEventListener('change',()=>setRisk('p',$('p').value));
$('preset').addEventListener('change',()=>{
  values=preset($('preset').value);scenarioLabel=$('preset').selectedOptions[0].textContent;sim=null;$('history').replaceChildren();
  $('message').textContent='Риски загружены. Запустите землетрясение.';draw();
});
$('reset').addEventListener('click',()=>{
  if(sim){sim=null;$('history').replaceChildren();$('message').textContent='Расчёт сброшен, значения рисков сохранены.';}
  else{values=preset($('preset').value);scenarioLabel=$('preset').selectedOptions[0].textContent;$('message').textContent='Сценарий восстановлен.';}
  draw();
});
$('loadSaved').addEventListener('click',()=>{
  try{
    const raw=localStorage.getItem(savedKey);
    if(!raw)throw Error('Нет сохранённой партии.');
    const game=JSON.parse(raw);
    if(!game||!Array.isArray(game.constructions)||!game.districts)throw Error('Неизвестный формат.');
    values=fromGame(game);sim=null;scenarioLabel='Риски из сохранённой партии';
    $('preset').value='base';$('history').replaceChildren();
    $('message').textContent='Загружены реальные риски партии. Сохранение не изменено.';
    draw();
  }catch(err){$('message').textContent='Не получилось загрузить партию: '+err.message;}
});
$('quake').addEventListener('click',()=>{
  if(sim||playing)return;
  sim=begin(values,{ignition:Math.max(1,riskValue($('igniteAt').value)),spread:Math.max(1,riskValue($('spreadBy').value))});$('history').replaceChildren();
  $('message').textContent=sim.starts.length
    ?'Землетрясение! Начальные очаги: '+sim.starts.map(name).join(', ')+'.'
    :'Землетрясение: нет разрушенных районов, источники пожара отсутствуют.';
  draw();
});
function oneStep(){
  if(!sim||sim.done)return;
  const event=next(sim);const st=stats(sim);
  const li=document.createElement('li');
  const changes=event.hits.map(h=>name(h.id)+' П'+h.before+'→'+h.after+(h.newlyBurning?' 🔥':'')).join('; ');
  const head=document.createElement('strong');
  head.textContent=event.index+'. '+name(event.source)+' → '+event.hits.length+' соседей';
  const details=document.createElement('div');
  details.textContent=changes;
  li.append(head,details);$('history').append(li);
  $('message').textContent=sim.done
    ?'Готово: сгорели '+st.burning+' из '+st.total+' районов. Новых очагов: '+st.newFires+'.'
    :'Обработан '+name(event.source)+'. Всего загорелось: '+st.burning+'.';
  draw();
}
$('step').addEventListener('click',oneStep);
$('all').addEventListener('click',async()=>{
  if(!sim||sim.done||playing)return;
  playing=true;draw();
  while(!sim.done){
    oneStep();
    await new Promise(resolve=>setTimeout(resolve,130));
  }
  playing=false;draw();
});
draw();loadMap();

async function copyFullReport(){
  // No intermediate modal, export, share sheet or file download is needed.
  const text=formatReport({
    input:values,simulation:sim,scenario:scenarioLabel,
    config:{ignition:Math.max(1,riskValue($('igniteAt').value)),
      spread:Math.max(1,riskValue($('spreadBy').value))}
  });
  const feedback=$('copyFeedback');
  try{
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text);
  }catch{
    // iOS Safari compatibility fallback when Clipboard API is unavailable.
    const field=document.createElement('textarea');
    field.value=text;
    field.setAttribute('readonly','');
    field.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;z-index:-1';
    document.body.append(field);
    field.focus();field.select();field.setSelectionRange(0,field.value.length);
    let success=false;
    try{success=document.execCommand('copy');}catch{}
    field.remove();
    if(!success){feedback.textContent='Не получилось скопировать. Разрешите доступ к буферу обмена.';return;}
  }
  feedback.textContent='Скопировано: сценарий, все З/П, шаги и результаты. Вставьте отчёт в чат.';
}
$('copyReport').addEventListener('click',copyFullReport);
