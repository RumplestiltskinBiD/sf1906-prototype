import {
  PROJECTS,DISTRICTS,MAX_ROUNDS,RESOURCE_PRICES,BASE_ROUND_INCOME,projectById,districtById,turnOrder,currentDeclarer,openingPrice,
  createInitialState,claimProject,passDeclaration,beginBidding,currentBidTask,submitBid,
  resolveTenders,cleanupMarket,districtConstructionCount,constructionEligibility,beginConstruction,setLandValue,
  constructionProgress,canDeliverMaterial,deliverMaterial,canRentOverflow,rentOverflowSlot,roundIncome,buildingIncome,warehouseCapacityBonus
} from './game-core.js';

const STORAGE_KEY='sf1906_phase1_ui_v018';
const LEGACY_STORAGE_KEYS=['sf1906_phase1_ui_v017','sf1906_phase1_ui_v0166','sf1906_phase1_ui_v0165'];
let state=loadState();
let inspectedOffice=0;
let pendingBidReveal=false;
let mobileContextOpen=false;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function loadState(){
  try{
    let raw=localStorage.getItem(STORAGE_KEY);
    if(!raw){
      for(const key of LEGACY_STORAGE_KEYS){raw=localStorage.getItem(key);if(raw)break;}
    }
    if(raw){
      const parsed=JSON.parse(raw);
      if(['0.16.5','0.16.6','0.17','0.18'].includes(parsed?.version))return migrateState(parsed);
    }
  }catch(e){}
  return createInitialState();
}
function migrateState(parsed){
  parsed.version='0.18';
  parsed.players=(parsed.players||[]).map(p=>({...p,workersLeft:p.workersLeft??3,portfolio:p.portfolio||[]}));
  parsed.constructions=(parsed.constructions||[]).map(x=>({...x,materialsDelivered:x.materialsDelivered||[],rentedSlots:x.rentedSlots||0,completedRound:x.completedRound??null}));
  parsed.nextConstructionId=parsed.nextConstructionId||(
    parsed.constructions.reduce((m,x)=>Math.max(m,Number(String(x.id||'').replace(/\D/g,''))||0),0)+1
  );
  parsed.districts=parsed.districts||Object.fromEntries(DISTRICTS.map(d=>[d.id,{landValue:d.landValue,sites:d.sites}]));
  DISTRICTS.forEach(d=>{
    parsed.districts[d.id]=parsed.districts[d.id]||{landValue:d.landValue,sites:d.sites};
    if(parsed.districts[d.id].landValue==null)parsed.districts[d.id].landValue=d.landValue;
    if(parsed.districts[d.id].sites==null)parsed.districts[d.id].sites=d.sites;
  });
  parsed.pendingConstruction=null;
  return parsed;
}
function isMobile(){return window.matchMedia('(max-width:640px)').matches;}
function closeMobileContext(){mobileContextOpen=false;syncMobileContext();}
function syncMobileContext(){
  const open=isMobile()&&mobileContextOpen;
  $('#contextPanel')?.classList.toggle('mobile-open',open);
  document.body.classList.toggle('context-open',open);
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function playerColor(pid){return state.players[pid].key;}
function typeClass(type){return type==='Жильё'?'type-housing':type==='Коммерция'?'type-commerce':type==='Промышленность'?'type-industry':type==='Логистика'?'type-logistics':type==='Городская служба'?'type-civic':'type-infra';}
const RESOURCE_ORDER=['Lumber','Masonry','Steel'];
function materialLabel(x){return {Lumber:'Lumber',Masonry:'Masonry',Steel:'Steel'}[x]||x;}
function materialShort(x){return {Lumber:'L',Masonry:'M',Steel:'S'}[x]||'?';}
function materialClass(x){return {Lumber:'lumber',Masonry:'masonry',Steel:'steel'}[x]||'';}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),1800);}

function render(){
  saveState();
  renderTop();renderPlayers();renderViews();renderMarket();renderSupply();renderCity();renderContext();renderOffice();renderLog();renderDebug();renderActionBar();renderTenderSteps();syncMobileContext();
  if(state.phase==='bids'&&!$('#privacyModal').classList.contains('open')&&!pendingBidReveal)openBidCurtain();
}

function renderTop(){
  $('#roundStat').textContent=state.finished?`${MAX_ROUNDS} / ${MAX_ROUNDS}`:`${state.round} / ${MAX_ROUNDS}`;
  $('#firstStat').textContent=state.players[state.firstPlayer].name;
  $('#phaseStat').textContent=state.phase==='declare'?'City Hall · заявки':state.phase==='bids'?'City Hall · ставки':state.phase==='ready'?'City Hall · вскрытие':state.phase==='development'?'Развитие города':'Тест завершён';
}

function renderPlayers(){
  const el=$('#playersBar');el.innerHTML='';const cd=currentDeclarer(state);
  state.players.forEach((p,i)=>{
    const pill=document.createElement('button');pill.className=`player-pill ${cd===i&&state.phase==='declare'?'active':''} ${state.firstPlayer===i?'first':''}`;pill.dataset.office=i;
    pill.innerHTML=`<span class="player-dot ${p.key}"></span><span><span class="player-name">${p.name}</span><span class="player-meta"><span>👤 ${p.workersLeft??0} · Inf ${p.influence} · +${roundIncome(state,p.id)}</span><span>Проекты ${p.portfolio.length}</span></span></span><span class="player-money">${p.capital}</span>`;
    pill.onclick=()=>{inspectedOffice=i;openDrawer('officeDrawer');renderOffice();};el.appendChild(pill);
  });
}

function setView(view){state.view=view;$$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#hallView').classList.toggle('active',view==='hall');$('#cityView').classList.toggle('active',view==='city');saveState();renderContext();}
function renderViews(){setViewSilently(state.view||'hall');$('#endRoundBtn').disabled=state.phase!=='development'||state.finished;}
function setViewSilently(view){$$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#hallView').classList.toggle('active',view==='hall');$('#cityView').classList.toggle('active',view==='city');}

function renderTenderSteps(){
  const steps=[['declare','1 Заявки'],['bids','2 Закрытые ставки'],['ready','3 Вскрытие'],['development','4 Развитие']];
  const order={declare:0,bids:1,ready:2,development:3,finished:4};const current=order[state.phase]??0;
  $('#tenderSteps').innerHTML=steps.map(([id,label],idx)=>`<span class="step-chip ${idx===current?'active':idx<current?'done':''}">${label}</span>`).join('');
  $('#hallInstruction').textContent=state.phase==='declare'?'Игроки по очереди заявляются на один проект или пасуют. Последний игрок видит предыдущие заявки.':state.phase==='bids'?'Проекты уже выбраны. Конкурирующие игроки делают ставки по одному за защитной шторкой.':state.phase==='ready'?'Все закрытые ставки собраны. Вскройте их одновременно и определите победителей.':state.phase==='development'?'Тендеры завершены. Результаты остаются видимыми до конца раунда.':'Тест завершён.';
}

function renderMarket(){
  const el=$('#projectMarket');el.innerHTML='';const cd=currentDeclarer(state);const already=cd!=null&&state.market.some(x=>x&&x.claims.some(c=>c.player===cd));
  for(let slot=0;slot<5;slot++){
    const m=state.market[slot];
    if(!m){const d=document.createElement('div');d.className='project-card empty';d.innerHTML=`<span>Пустое место рынка</span>`;el.appendChild(d);continue;}
    const p=projectById(m.id),price=openingPrice(m),selected=state.selectedProjectId===m.id;
    const card=document.createElement('article');card.className=`project-card ${typeClass(p.type)} ${m.age===1?'old':''} ${m.sold?'sold':''} ${selected?'selected':''}`;card.onclick=e=>{if(!e.target.closest('button')){state.selectedProjectId=m.id;if(isMobile())mobileContextOpen=true;render();}};
    const claims=m.claims.map(c=>`<span class="claim-chip"><span class="claim-dot ${playerColor(c.player)}"></span>${state.players[c.player].name}</span>`).join('');
    const canClaim=state.phase==='declare'&&cd!=null&&!already&&!m.sold&&state.players[cd].capital>=price;
    const result=m.result?`<div class="result-box">${state.players[m.result.player].name} · $${m.result.price}<br>${m.result.reason}</div>`:'';
    card.innerHTML=`<div class="card-stripe"></div><div class="project-inner"><div class="card-top"><span class="slot-mark">SLOT ${slot+1}</span><span class="age-badge ${m.age===1?'last':''}">${m.age===1?'LAST CHANCE · −$1':'NEW'}</span></div><div class="project-title">${p.name}</div><div class="project-type">${p.type}</div><div class="opening-price">$${price}<small>opening</small></div><div class="mini-line"><b>${p.materials.length}</b> ресурсов · ${p.requires}</div><div class="claims-row">${claims||'<span class="mini-line">Нет заявок</span>'}</div>${result}<button class="claim-btn ${canClaim?'':'secondary'}" ${canClaim?'':'disabled'} data-slot="${slot}">${m.sold?'Продан':canClaim?'Заявиться':'Недоступно'}</button></div>`;
    card.querySelector('[data-slot]').onclick=()=>doClaim(slot);el.appendChild(card);
  }
}

function renderActionBar(){
  const bar=$('#hallActionBar');
  if(state.phase==='declare'){
    const pid=currentDeclarer(state);
    if(pid==null){bar.innerHTML=`<div class="sticky-copy"><strong>Все заявки сделаны</strong><span>Перейдите к закрытым ставкам. Если конкуренции нет, сразу к вскрытию.</span></div><div class="sticky-actions"><button class="secondary-btn" id="nextTenderStage">Перейти к ставкам</button></div>`;$('#nextTenderStage').onclick=()=>{beginBidding(state);render();};}
    else bar.innerHTML=`<div class="sticky-copy"><strong>Заявка: ${state.players[pid].name}</strong><span>Выберите один проект. Решение видно следующим игрокам.</span></div><div class="sticky-actions"><button class="ghost-btn" id="passTender">Пас</button></div>`,$('#passTender').onclick=()=>{passDeclaration(state);render();};
  }else if(state.phase==='bids'){
    const q=currentBidTask(state);const pl=q?state.players[q.player]:null;bar.innerHTML=`<div class="sticky-copy"><strong>Закрытые ставки</strong><span>${pl?`Следующая ставка: ${pl.name}`:'Ставки собраны'}. Суммы скрыты до вскрытия.</span></div><div class="sticky-actions"><button class="secondary-btn" id="openBidNow">Продолжить ставки</button></div>`;$('#openBidNow').onclick=openBidCurtain;
  }else if(state.phase==='ready'){
    bar.innerHTML=`<div class="sticky-copy"><strong>Ставки собраны</strong><span>При равной сумме выигрывает больший Influence; затем более ранняя заявка.</span></div><div class="sticky-actions"><button class="primary-btn" id="resolveTender">Вскрыть ставки</button></div>`;$('#resolveTender').onclick=()=>{resolveTenders(state);render();};
  }else if(state.phase==='development'){
    bar.innerHTML=`<div class="sticky-copy"><strong>City Hall Session завершена</strong><span>Переходите в город. Cleanup рынка произойдёт при завершении раунда.</span></div><div class="sticky-actions"><button class="secondary-btn" id="enterCity">Перейти в город</button></div>`;$('#enterCity').onclick=()=>{state.view='city';render();};
  }else{
    bar.innerHTML=`<div class="sticky-copy"><strong>Тест завершён</strong><span>Можно изучить результаты или начать новую партию.</span></div><div class="sticky-actions"><button class="primary-btn" id="restartBottom">Новая партия</button></div>`;$('#restartBottom').onclick=newGame;
  }
}

function doClaim(slot){const res=claimProject(state,slot);if(!res.ok&&res.reason==='capital')showToast('Недостаточно капитала для opening price');render();}

function openBidCurtain(){
  if(state.phase!=='bids')return;const q=currentBidTask(state);if(!q){render();return;}pendingBidReveal=true;
  const m=state.market[q.slot],p=projectById(m.id),pl=state.players[q.player];
  $('#modalBackdrop').classList.add('open');$('#privacyModal').classList.add('open');
  $('#privacyCard').innerHTML=`<div class="privacy-curtain"><div class="eyebrow">PASS & PLAY · SECRET BID</div><div class="big-player">${pl.name}</div><p>Передайте устройство этому игроку. Ставка остальных на экран не выводится.</p><button class="secondary-btn full" id="revealBidForm">Я готов сделать ставку</button></div>`;
  $('#revealBidForm').onclick=()=>{
    const min=openingPrice(m);
    $('#privacyCard').innerHTML=`<div class="eyebrow">SECRET BID</div><h3>${p.name}</h3><p>Opening price <b>$${min}</b> · капитал ${pl.name}: <b>$${pl.capital}</b></p><div class="bid-form"><label for="secretBid">Ваша максимальная ставка</label><input class="bid-input" id="secretBid" type="number" inputmode="numeric" min="${min}" max="${pl.capital}" value="${min}"/><div class="modal-actions"><button class="primary-btn" id="submitSecretBid">Подтвердить и скрыть</button></div></div>`;
    $('#submitSecretBid').onclick=()=>{const v=$('#secretBid').value;const r=submitBid(state,v);if(!r.ok){showToast(`Ставка должна быть от $${r.min} до $${r.max}`);return;}closePrivacy();pendingBidReveal=false;render();};setTimeout(()=>$('#secretBid')?.focus(),40);
  };
}
function closePrivacy(){ $('#privacyModal').classList.remove('open');$('#modalBackdrop').classList.remove('open'); }

const DISTRICT_POS={
  pacific:[275,198],financial:[708,250],civic:[510,322],western:[308,340],
  soma:[535,452],mission:[365,502],missionbay:[742,444],sunset:[182,462]
};
const TOKEN_OFFSETS=[[-24,-12],[0,-12],[24,-12],[-12,13],[12,13],[36,13]];

function renderSupply(){
  const el=$('#resourceSupply');if(!el)return;
  el.innerHTML='<div class="supply-label"><strong>SUPPLY YARD</strong><span>v0.18 · доставка прямо на стройку</span></div><div class="supply-items">'+RESOURCE_ORDER.map(type=>'<span class="supply-resource '+materialClass(type)+'"><b>'+materialShort(type)+'</b><span>'+materialLabel(type)+'</span><strong>
  const pending=state.pendingConstruction;
  const mode=$('#constructionMode');
  if(state.phase!=='development'){
    mode.innerHTML='<div><strong>Строительство пока закрыто</strong><span>Сначала завершите City Hall Session.</span></div>';
    mode.className='construction-mode muted';
  }else if(pending){
    const pl=state.players[pending.playerId],pr=projectById(pending.projectId);
    mode.className='construction-mode active';
    mode.innerHTML=`<div><strong>${pl.name}: ${pr.name}</strong><span>Выберите подсвеченный район. Старт = Land Value + 1 представитель.</span></div><button class="ghost-btn" id="cancelConstruction">Отмена</button>`;
    $('#cancelConstruction').onclick=()=>{state.pendingConstruction=null;mobileContextOpen=false;render();};
  }else{
    const total=state.players.reduce((n,p)=>n+(p.workersLeft||0),0);
    mode.className='construction-mode';
    mode.innerHTML=`<div><strong>Development Phase</strong><span>Откройте Офис и выберите выигранный проект. Свободных представителей у игроков: ${total}.</span></div><button class="secondary-btn" id="openOfficeFromCity">Офис</button>`;
    $('#openOfficeFromCity').onclick=()=>{inspectedOffice=state.firstPlayer;openDrawer('officeDrawer');renderOffice();};
  }

  $$('[data-district]').forEach(g=>{
    const id=g.dataset.district;
    const selected=state.selectedDistrictId===id;
    g.classList.toggle('selected',selected);
    g.classList.remove('build-ok','build-blocked');
    if(pending){
      const check=constructionEligibility(state,pending.playerId,pending.projectId,id);
      g.classList.add(check.ok?'build-ok':'build-blocked');
    }
  });

  const meta=$('#districtMetaLayer');
  if(meta){
    meta.innerHTML=DISTRICTS.map(d=>{
      const ds=state.districts[d.id],used=districtConstructionCount(state,d.id),[x,y]=DISTRICT_POS[d.id];
      const pendingCheck=pending?constructionEligibility(state,pending.playerId,pending.projectId,d.id):null;
      const klass=pending?(pendingCheck.ok?'district-meta eligible':'district-meta blocked'):'district-meta';
      return `<text class="${klass}" x="${x}" y="${y}">LAND ${ds.landValue} · ${used}/${ds.sites}</text>`;
    }).join('');
  }

  const layer=$('#constructionLayer');
  if(layer){
    const byDistrict={};
    (state.constructions||[]).forEach(x=>(byDistrict[x.districtId] ||= []).push(x));
    let html='';
    Object.entries(byDistrict).forEach(([districtId,list])=>{
      const [cx,cy]=DISTRICT_POS[districtId]||[0,0];
      list.forEach((con,i)=>{
        const [dx,dy]=TOKEN_OFFSETS[i]||[0,34+i*12];
        const pl=state.players[con.playerId],pr=projectById(con.projectId);
        html+=`<g class="construction-token token-${pl.key}" transform="translate(${cx+dx} ${cy+dy+30})"><circle r="16"/><text y="3">${i+1}</text><title>${pl.name}: ${pr.name} — Under Construction</title></g>`;
      });
    });
    layer.innerHTML=html;
  }
}

function startConstructionFlow(playerId,projectId){
  const pl=state.players[playerId],pr=projectById(projectId);
  if(state.phase!=='development'){showToast('Сначала завершите тендеры');return;}
  if(!pl.portfolio.includes(projectId)){showToast('Проект уже недоступен');return;}
  if((pl.workersLeft??0)<=0){showToast('У игрока нет свободных представителей');return;}
  state.pendingConstruction={playerId,projectId};
  state.view='city';state.selectedDistrictId=state.selectedDistrictId||'civic';
  mobileContextOpen=false;closeDrawers();render();
  showToast(`Выберите район для «${pr.name}»`);
}

function confirmConstructionInDistrict(){
  const pending=state.pendingConstruction;
  if(!pending)return;
  const r=beginConstruction(state,pending.playerId,pending.projectId,state.selectedDistrictId);
  if(!r.ok){showToast(r.reasons?.[0]||'Нельзя начать строительство здесь');render();return;}
  mobileContextOpen=false;
  showToast(`Стройка начата · земля ${r.cost}`);
  render();
}

function renderContext(){
  const panel=$('#contextPanel');
  const close=isMobile()?'<button class="context-close" id="contextClose" aria-label="Закрыть подробности">×</button>':'';
  if(state.view==='hall'){
    const m=state.market.find(x=>x&&x.id===state.selectedProjectId)||state.market.find(Boolean);if(!m){panel.innerHTML=close+'<div class="empty-state">На рынке нет проекта.</div>';wireContextClose();return;}
    const p=projectById(m.id);const claims=m.claims.map(c=>state.players[c.player].name).join(', ')||'нет';
    panel.innerHTML=`${close}<div class="detail-type">${p.type}</div><h3>${p.name}</h3><div class="detail-price">$${openingPrice(m)} <span style="font-size:11px;color:#84786a">opening</span></div><div class="detail-section"><div class="detail-label">Материалы</div><div class="material-tags">${p.materials.map(x=>`<span class="material-tag">${materialLabel(x)}</span>`).join('')}</div></div><div class="detail-section"><div class="detail-label">Условия</div><div class="detail-text">${p.requires}</div></div><div class="detail-section"><div class="detail-label">После постройки</div><div class="detail-text">${p.effect}</div></div><div class="detail-section"><div class="detail-label">Тендер</div><div class="detail-text">Заявки: ${claims}<br>${m.age===1?'Последний шанс · скидка $1':'Новый проект'}${m.result?`<br><b>Результат: ${state.players[m.result.player].name} за $${m.result.price}</b>`:''}</div></div>`;
  }else{
    const d=districtById(state.selectedDistrictId)||DISTRICTS[0];
    const ds=state.districts[d.id],used=districtConstructionCount(state,d.id),free=Math.max(0,ds.sites-used);
    const builtHere=(state.constructions||[]).filter(x=>x.districtId===d.id);
    let constructionHtml='';
    if(state.pendingConstruction){
      const pending=state.pendingConstruction,pl=state.players[pending.playerId],pr=projectById(pending.projectId);
      const check=constructionEligibility(state,pending.playerId,pending.projectId,d.id);
      constructionHtml=`<div class="construction-confirm ${check.ok?'ok':'blocked'}"><div class="detail-label">Begin Construction</div><strong>${pl.name} · ${pr.name}</strong><div class="construction-cost"><span>Земля <b>${check.cost}</b></span><span>Представитель <b>1</b></span></div>${check.ok?'<button class="primary-btn full" id="confirmConstruction">Начать строительство</button>':`<div class="eligibility-errors">${check.reasons.map(x=>`<div>• ${x}</div>`).join('')}</div>`}</div>`;
    }
    panel.innerHTML=`${close}<div class="detail-type">DISTRICT</div><h3>${d.name}</h3><div class="district-stats"><div><span>LAND VALUE</span><strong>${ds.landValue}</strong></div><div><span>ПЛОЩАДКИ</span><strong>${used} / ${ds.sites}</strong></div><div><span>СВОБОДНО</span><strong>${free}</strong></div></div><div class="detail-section"><div class="detail-label">Характер района</div><div class="detail-text">${d.hint}</div></div>${constructionHtml}<div class="detail-section"><div class="detail-label">Стройки в районе</div><div class="detail-text">${builtHere.length?builtHere.map(x=>`<div class="mini-construction"><span class="player-dot ${state.players[x.playerId].key}"></span><b>${projectById(x.projectId).name}</b> · ${state.players[x.playerId].name}</div>`).join(''):'Пока нет.'}</div></div><div class="district-placeholder"><b>v0.17:</b> сейчас реально проверяются Land Value, свободные площадки, капитал и представитель. Road / Fire Protection / Clinic / Rail / Port пока показаны на карте проекта, но не блокируют строительство.</div>`;
    const confirm=$('#confirmConstruction');if(confirm)confirm.onclick=confirmConstructionInDistrict;
  }
  wireContextClose();
}
function wireContextClose(){const b=$('#contextClose');if(b)b.onclick=closeMobileContext;}

function renderOffice(){
  const p=state.players[inspectedOffice]||state.players[0];$('#officeTitle').textContent=`Офис · ${p.name}`;
  const active=(state.constructions||[]).filter(x=>x.playerId===p.id);
  const available=p.portfolio.map(id=>{
    const pr=projectById(id);
    const disabled=state.phase!=='development'||(p.workersLeft??0)<=0;
    return `<div class="portfolio-card available-project"><strong>${pr.name}</strong><span>${pr.type} · ${pr.materials.length} ресурсов</span><span>${pr.requires}</span><button class="secondary-btn full" data-start-project="${id}" data-player="${p.id}" ${disabled?'disabled':''}>${state.phase!=='development'?'После тендеров':(p.workersLeft??0)<=0?'Нет представителей':'Начать строительство'}</button></div>`;
  }).join('');
  const activeHtml=active.map(x=>{const pr=projectById(x.projectId),d=districtById(x.districtId);return `<div class="portfolio-card construction-card"><strong>${pr.name}</strong><span>${d.name} · UNDER CONSTRUCTION</span></div>`;}).join('');
  $('#officeContent').innerHTML=`<div class="office-tabs">${state.players.map((x,i)=>`<button class="office-tab ${i===inspectedOffice?'active':''}" data-office-tab="${i}">${x.name}</button>`).join('')}</div><div class="office-summary three"><div class="office-stat"><span>Capital</span><strong>${p.capital}</strong></div><div class="office-stat"><span>Influence</span><strong>${p.influence}</strong></div><div class="office-stat"><span>Representatives</span><strong>${p.workersLeft??0} / 3</strong></div></div><div class="detail-label">Available Projects</div><div style="margin-top:7px">${available||'<div class="empty-state">Нет доступных проектов. Выиграйте их в City Hall.</div>'}</div><div class="detail-label office-subhead">Under Construction</div><div style="margin-top:7px">${activeHtml||'<div class="empty-state compact">Активных строек пока нет.</div>'}</div><div class="district-placeholder"><b>Следующий слой:</b> в v0.18 на этих стройках появятся 3 слота ресурсов и завершение здания.</div>`;
  $$('[data-office-tab]').forEach(b=>b.onclick=()=>{inspectedOffice=+b.dataset.officeTab;renderOffice();});
  $$('[data-start-project]').forEach(b=>b.onclick=()=>startConstructionFlow(+b.dataset.player,b.dataset.startProject));
}

function renderLog(){const el=$('#gameLog');el.innerHTML=state.log.map(x=>`<div class="${x.cls||''}">${escapeHtml(x.msg)}</div>`).join('');el.scrollTop=el.scrollHeight;}
function renderDebug(){
  const players=state.players.map((p,i)=>`<div class="debug-player"><div class="debug-head"><span>${p.name}</span><span>${p.capital} · Inf ${p.influence} · 👤 ${p.workersLeft??0}</span></div><div class="debug-actions"><button class="mini-btn" data-money="${i}" data-delta="5">+$5</button><button class="mini-btn" data-money="${i}" data-delta="-5">−$5</button><button class="mini-btn" data-inf="${i}" data-delta="1">Inf +1</button><button class="mini-btn" data-workers="${i}">👤 = 3</button></div></div>`).join('');
  const lands=DISTRICTS.map(d=>`<div class="debug-land"><span>${d.name}</span><div><button class="mini-btn" data-land="${d.id}" data-delta="-1">−</button><b>${state.districts[d.id].landValue}</b><button class="mini-btn" data-land="${d.id}" data-delta="1">+</button></div></div>`).join('');
  $('#debugPlayers').innerHTML=players+`<div class="debug-section-title">Land Value</div>${lands}`;
  $$('[data-money]').forEach(b=>b.onclick=()=>{const p=state.players[+b.dataset.money];p.capital=Math.max(0,p.capital+(+b.dataset.delta));render();});
  $$('[data-inf]').forEach(b=>b.onclick=()=>{const p=state.players[+b.dataset.inf];p.influence=Math.max(0,p.influence+(+b.dataset.delta));render();});
  $$('[data-workers]').forEach(b=>b.onclick=()=>{state.players[+b.dataset.workers].workersLeft=3;render();});
  $$('[data-land]').forEach(b=>b.onclick=()=>{const id=b.dataset.land;setLandValue(state,id,state.districts[id].landValue+(+b.dataset.delta));render();});
}

function openDrawer(id){closeMobileContext();closeDrawers();$('#drawerBackdrop').classList.add('open');$('#'+id).classList.add('open');}
function closeDrawers(){$('#drawerBackdrop').classList.remove('open');$$('.drawer').forEach(d=>d.classList.remove('open'));}
function newGame(){if(!confirm('Начать новую тестовую партию?'))return;state=createInitialState();inspectedOffice=0;localStorage.removeItem(STORAGE_KEY);LEGACY_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));closeDrawers();closeMobileContext();render();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

$$('.nav-btn[data-view]').forEach(b=>b.onclick=()=>{mobileContextOpen=false;state.view=b.dataset.view;render();});
$('#officeBtn').onclick=()=>{inspectedOffice=state.firstPlayer;openDrawer('officeDrawer');renderOffice();};
$('#logBtn').onclick=()=>openDrawer('logDrawer');
$('#settingsBtn').onclick=()=>openDrawer('settingsDrawer');
$('#helpBtn').onclick=()=>{showToast('Мэрия → проект в Офис → Begin Construction → район → земля + 1 представитель');};
$('#drawerBackdrop').onclick=closeDrawers;
$('#contextBackdrop').onclick=closeMobileContext;$$('[data-close-drawer]').forEach(b=>b.onclick=closeDrawers);
$('#modalBackdrop').onclick=()=>{};
$('#newGameBtn').onclick=newGame;
$('#copyLogBtn').onclick=async()=>{const text=state.log.map(x=>x.msg).join('\n');try{await navigator.clipboard.writeText(text);showToast('Лог скопирован');}catch{prompt('Скопируйте лог:',text);}};
$('#endRoundBtn').onclick=()=>{state.pendingConstruction=null;mobileContextOpen=false;const r=cleanupMarket(state);if(r.ok){state.view=r.finished?'city':'hall';render();}};
$$('[data-district]').forEach(g=>g.onclick=()=>{state.selectedDistrictId=g.dataset.district;if(isMobile())mobileContextOpen=true;render();});
window.addEventListener('resize',()=>{if(!isMobile())mobileContextOpen=false;syncMobileContext();});

render();
+RESOURCE_PRICES[type]+'</strong></span>').join('')+'</div>';
}

function renderCity(){
  const pending=state.pendingConstruction;
  const mode=$('#constructionMode');
  if(state.phase!=='development'){
    mode.innerHTML='<div><strong>Строительство пока закрыто</strong><span>Сначала завершите City Hall Session.</span></div>';
    mode.className='construction-mode muted';
  }else if(pending){
    const pl=state.players[pending.playerId],pr=projectById(pending.projectId);
    mode.className='construction-mode active';
    mode.innerHTML=`<div><strong>${pl.name}: ${pr.name}</strong><span>Выберите подсвеченный район. Старт = Land Value + 1 представитель.</span></div><button class="ghost-btn" id="cancelConstruction">Отмена</button>`;
    $('#cancelConstruction').onclick=()=>{state.pendingConstruction=null;mobileContextOpen=false;render();};
  }else{
    const total=state.players.reduce((n,p)=>n+(p.workersLeft||0),0);
    mode.className='construction-mode';
    mode.innerHTML=`<div><strong>Development Phase</strong><span>Откройте Офис и выберите выигранный проект. Свободных представителей у игроков: ${total}.</span></div><button class="secondary-btn" id="openOfficeFromCity">Офис</button>`;
    $('#openOfficeFromCity').onclick=()=>{inspectedOffice=state.firstPlayer;openDrawer('officeDrawer');renderOffice();};
  }

  $$('[data-district]').forEach(g=>{
    const id=g.dataset.district;
    const selected=state.selectedDistrictId===id;
    g.classList.toggle('selected',selected);
    g.classList.remove('build-ok','build-blocked');
    if(pending){
      const check=constructionEligibility(state,pending.playerId,pending.projectId,id);
      g.classList.add(check.ok?'build-ok':'build-blocked');
    }
  });

  const meta=$('#districtMetaLayer');
  if(meta){
    meta.innerHTML=DISTRICTS.map(d=>{
      const ds=state.districts[d.id],used=districtConstructionCount(state,d.id),[x,y]=DISTRICT_POS[d.id];
      const pendingCheck=pending?constructionEligibility(state,pending.playerId,pending.projectId,d.id):null;
      const klass=pending?(pendingCheck.ok?'district-meta eligible':'district-meta blocked'):'district-meta';
      return `<text class="${klass}" x="${x}" y="${y}">LAND ${ds.landValue} · ${used}/${ds.sites}</text>`;
    }).join('');
  }

  const layer=$('#constructionLayer');
  if(layer){
    const byDistrict={};
    (state.constructions||[]).forEach(x=>(byDistrict[x.districtId] ||= []).push(x));
    let html='';
    Object.entries(byDistrict).forEach(([districtId,list])=>{
      const [cx,cy]=DISTRICT_POS[districtId]||[0,0];
      list.forEach((con,i)=>{
        const [dx,dy]=TOKEN_OFFSETS[i]||[0,34+i*12];
        const pl=state.players[con.playerId],pr=projectById(con.projectId);
        html+=`<g class="construction-token token-${pl.key}" transform="translate(${cx+dx} ${cy+dy+30})"><circle r="16"/><text y="3">${i+1}</text><title>${pl.name}: ${pr.name} — Under Construction</title></g>`;
      });
    });
    layer.innerHTML=html;
  }
}

function startConstructionFlow(playerId,projectId){
  const pl=state.players[playerId],pr=projectById(projectId);
  if(state.phase!=='development'){showToast('Сначала завершите тендеры');return;}
  if(!pl.portfolio.includes(projectId)){showToast('Проект уже недоступен');return;}
  if((pl.workersLeft??0)<=0){showToast('У игрока нет свободных представителей');return;}
  state.pendingConstruction={playerId,projectId};
  state.view='city';state.selectedDistrictId=state.selectedDistrictId||'civic';
  mobileContextOpen=false;closeDrawers();render();
  showToast(`Выберите район для «${pr.name}»`);
}

function confirmConstructionInDistrict(){
  const pending=state.pendingConstruction;
  if(!pending)return;
  const r=beginConstruction(state,pending.playerId,pending.projectId,state.selectedDistrictId);
  if(!r.ok){showToast(r.reasons?.[0]||'Нельзя начать строительство здесь');render();return;}
  mobileContextOpen=false;
  showToast(`Стройка начата · земля ${r.cost}`);
  render();
}

function renderContext(){
  const panel=$('#contextPanel');
  const close=isMobile()?'<button class="context-close" id="contextClose" aria-label="Закрыть подробности">×</button>':'';
  if(state.view==='hall'){
    const m=state.market.find(x=>x&&x.id===state.selectedProjectId)||state.market.find(Boolean);if(!m){panel.innerHTML=close+'<div class="empty-state">На рынке нет проекта.</div>';wireContextClose();return;}
    const p=projectById(m.id);const claims=m.claims.map(c=>state.players[c.player].name).join(', ')||'нет';
    panel.innerHTML=`${close}<div class="detail-type">${p.type}</div><h3>${p.name}</h3><div class="detail-price">$${openingPrice(m)} <span style="font-size:11px;color:#84786a">opening</span></div><div class="detail-section"><div class="detail-label">Материалы</div><div class="material-tags">${p.materials.map(x=>`<span class="material-tag">${materialLabel(x)}</span>`).join('')}</div></div><div class="detail-section"><div class="detail-label">Условия</div><div class="detail-text">${p.requires}</div></div><div class="detail-section"><div class="detail-label">После постройки</div><div class="detail-text">${p.effect}</div></div><div class="detail-section"><div class="detail-label">Тендер</div><div class="detail-text">Заявки: ${claims}<br>${m.age===1?'Последний шанс · скидка $1':'Новый проект'}${m.result?`<br><b>Результат: ${state.players[m.result.player].name} за $${m.result.price}</b>`:''}</div></div>`;
  }else{
    const d=districtById(state.selectedDistrictId)||DISTRICTS[0];
    const ds=state.districts[d.id],used=districtConstructionCount(state,d.id),free=Math.max(0,ds.sites-used);
    const builtHere=(state.constructions||[]).filter(x=>x.districtId===d.id);
    let constructionHtml='';
    if(state.pendingConstruction){
      const pending=state.pendingConstruction,pl=state.players[pending.playerId],pr=projectById(pending.projectId);
      const check=constructionEligibility(state,pending.playerId,pending.projectId,d.id);
      constructionHtml=`<div class="construction-confirm ${check.ok?'ok':'blocked'}"><div class="detail-label">Begin Construction</div><strong>${pl.name} · ${pr.name}</strong><div class="construction-cost"><span>Земля <b>${check.cost}</b></span><span>Представитель <b>1</b></span></div>${check.ok?'<button class="primary-btn full" id="confirmConstruction">Начать строительство</button>':`<div class="eligibility-errors">${check.reasons.map(x=>`<div>• ${x}</div>`).join('')}</div>`}</div>`;
    }
    panel.innerHTML=`${close}<div class="detail-type">DISTRICT</div><h3>${d.name}</h3><div class="district-stats"><div><span>LAND VALUE</span><strong>${ds.landValue}</strong></div><div><span>ПЛОЩАДКИ</span><strong>${used} / ${ds.sites}</strong></div><div><span>СВОБОДНО</span><strong>${free}</strong></div></div><div class="detail-section"><div class="detail-label">Характер района</div><div class="detail-text">${d.hint}</div></div>${constructionHtml}<div class="detail-section"><div class="detail-label">Стройки в районе</div><div class="detail-text">${builtHere.length?builtHere.map(x=>`<div class="mini-construction"><span class="player-dot ${state.players[x.playerId].key}"></span><b>${projectById(x.projectId).name}</b> · ${state.players[x.playerId].name}</div>`).join(''):'Пока нет.'}</div></div><div class="district-placeholder"><b>v0.17:</b> сейчас реально проверяются Land Value, свободные площадки, капитал и представитель. Road / Fire Protection / Clinic / Rail / Port пока показаны на карте проекта, но не блокируют строительство.</div>`;
    const confirm=$('#confirmConstruction');if(confirm)confirm.onclick=confirmConstructionInDistrict;
  }
  wireContextClose();
}
function wireContextClose(){const b=$('#contextClose');if(b)b.onclick=closeMobileContext;}

function renderOffice(){
  const p=state.players[inspectedOffice]||state.players[0];$('#officeTitle').textContent=`Офис · ${p.name}`;
  const active=(state.constructions||[]).filter(x=>x.playerId===p.id);
  const available=p.portfolio.map(id=>{
    const pr=projectById(id);
    const disabled=state.phase!=='development'||(p.workersLeft??0)<=0;
    return `<div class="portfolio-card available-project"><strong>${pr.name}</strong><span>${pr.type} · ${pr.materials.length} ресурсов</span><span>${pr.requires}</span><button class="secondary-btn full" data-start-project="${id}" data-player="${p.id}" ${disabled?'disabled':''}>${state.phase!=='development'?'После тендеров':(p.workersLeft??0)<=0?'Нет представителей':'Начать строительство'}</button></div>`;
  }).join('');
  const activeHtml=active.map(x=>{const pr=projectById(x.projectId),d=districtById(x.districtId);return `<div class="portfolio-card construction-card"><strong>${pr.name}</strong><span>${d.name} · UNDER CONSTRUCTION</span></div>`;}).join('');
  $('#officeContent').innerHTML=`<div class="office-tabs">${state.players.map((x,i)=>`<button class="office-tab ${i===inspectedOffice?'active':''}" data-office-tab="${i}">${x.name}</button>`).join('')}</div><div class="office-summary three"><div class="office-stat"><span>Capital</span><strong>${p.capital}</strong></div><div class="office-stat"><span>Influence</span><strong>${p.influence}</strong></div><div class="office-stat"><span>Representatives</span><strong>${p.workersLeft??0} / 3</strong></div></div><div class="detail-label">Available Projects</div><div style="margin-top:7px">${available||'<div class="empty-state">Нет доступных проектов. Выиграйте их в City Hall.</div>'}</div><div class="detail-label office-subhead">Under Construction</div><div style="margin-top:7px">${activeHtml||'<div class="empty-state compact">Активных строек пока нет.</div>'}</div><div class="district-placeholder"><b>Следующий слой:</b> в v0.18 на этих стройках появятся 3 слота ресурсов и завершение здания.</div>`;
  $$('[data-office-tab]').forEach(b=>b.onclick=()=>{inspectedOffice=+b.dataset.officeTab;renderOffice();});
  $$('[data-start-project]').forEach(b=>b.onclick=()=>startConstructionFlow(+b.dataset.player,b.dataset.startProject));
}

function renderLog(){const el=$('#gameLog');el.innerHTML=state.log.map(x=>`<div class="${x.cls||''}">${escapeHtml(x.msg)}</div>`).join('');el.scrollTop=el.scrollHeight;}
function renderDebug(){
  const players=state.players.map((p,i)=>`<div class="debug-player"><div class="debug-head"><span>${p.name}</span><span>${p.capital} · Inf ${p.influence} · 👤 ${p.workersLeft??0}</span></div><div class="debug-actions"><button class="mini-btn" data-money="${i}" data-delta="5">+$5</button><button class="mini-btn" data-money="${i}" data-delta="-5">−$5</button><button class="mini-btn" data-inf="${i}" data-delta="1">Inf +1</button><button class="mini-btn" data-workers="${i}">👤 = 3</button></div></div>`).join('');
  const lands=DISTRICTS.map(d=>`<div class="debug-land"><span>${d.name}</span><div><button class="mini-btn" data-land="${d.id}" data-delta="-1">−</button><b>${state.districts[d.id].landValue}</b><button class="mini-btn" data-land="${d.id}" data-delta="1">+</button></div></div>`).join('');
  $('#debugPlayers').innerHTML=players+`<div class="debug-section-title">Land Value</div>${lands}`;
  $$('[data-money]').forEach(b=>b.onclick=()=>{const p=state.players[+b.dataset.money];p.capital=Math.max(0,p.capital+(+b.dataset.delta));render();});
  $$('[data-inf]').forEach(b=>b.onclick=()=>{const p=state.players[+b.dataset.inf];p.influence=Math.max(0,p.influence+(+b.dataset.delta));render();});
  $$('[data-workers]').forEach(b=>b.onclick=()=>{state.players[+b.dataset.workers].workersLeft=3;render();});
  $$('[data-land]').forEach(b=>b.onclick=()=>{const id=b.dataset.land;setLandValue(state,id,state.districts[id].landValue+(+b.dataset.delta));render();});
}

function openDrawer(id){closeMobileContext();closeDrawers();$('#drawerBackdrop').classList.add('open');$('#'+id).classList.add('open');}
function closeDrawers(){$('#drawerBackdrop').classList.remove('open');$$('.drawer').forEach(d=>d.classList.remove('open'));}
function newGame(){if(!confirm('Начать новую тестовую партию?'))return;state=createInitialState();inspectedOffice=0;localStorage.removeItem(STORAGE_KEY);LEGACY_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));closeDrawers();closeMobileContext();render();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

$$('.nav-btn[data-view]').forEach(b=>b.onclick=()=>{mobileContextOpen=false;state.view=b.dataset.view;render();});
$('#officeBtn').onclick=()=>{inspectedOffice=state.firstPlayer;openDrawer('officeDrawer');renderOffice();};
$('#logBtn').onclick=()=>openDrawer('logDrawer');
$('#settingsBtn').onclick=()=>openDrawer('settingsDrawer');
$('#helpBtn').onclick=()=>{showToast('Мэрия → проект в Офис → Begin Construction → район → земля + 1 представитель');};
$('#drawerBackdrop').onclick=closeDrawers;
$('#contextBackdrop').onclick=closeMobileContext;$$('[data-close-drawer]').forEach(b=>b.onclick=closeDrawers);
$('#modalBackdrop').onclick=()=>{};
$('#newGameBtn').onclick=newGame;
$('#copyLogBtn').onclick=async()=>{const text=state.log.map(x=>x.msg).join('\n');try{await navigator.clipboard.writeText(text);showToast('Лог скопирован');}catch{prompt('Скопируйте лог:',text);}};
$('#endRoundBtn').onclick=()=>{state.pendingConstruction=null;mobileContextOpen=false;const r=cleanupMarket(state);if(r.ok){state.view=r.finished?'city':'hall';render();}};
$$('[data-district]').forEach(g=>g.onclick=()=>{state.selectedDistrictId=g.dataset.district;if(isMobile())mobileContextOpen=true;render();});
window.addEventListener('resize',()=>{if(!isMobile())mobileContextOpen=false;syncMobileContext();});

render();
