export const PLAYER_NAMES = ['Синий','Красный','Зелёный'];
export const PLAYER_KEYS = ['blue','red','green'];
export const MAX_ROUNDS = 3;
export const RESOURCE_PRICES = {Lumber:1,Masonry:1,Steel:2};
export const BASE_ROUND_INCOME = 3;

export const PROJECTS = [
  {income:2,id:'tenement',name:'Рабочий доходный дом',type:'Жильё',open:2,materials:['Lumber','Lumber','Masonry'],requires:'Road access',effect:'Income +2 · много жителей'},
  {income:3,id:'speculative',name:'Спекулятивный жилой комплекс',type:'Жильё',open:3,materials:['Lumber','Lumber','Lumber'],requires:'Land Value ≤2',effect:'Income +3 · очень много жителей · высокий риск',landMax:2},
  {income:3,id:'luxury',name:'Роскошные апартаменты',type:'Жильё',open:5,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Land Value 3+ · Fire Protection',effect:'Income +3 · Influence +1',landMin:3},
  {income:2,id:'shops',name:'Торговый ряд',type:'Коммерция',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Road access · Land Value 1+',effect:'Income +2 · коммерческое action space',landMin:1},
  {income:4,id:'hotel',name:'Гранд-отель',type:'Коммерция',open:6,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Land Value 3+ · Fire Protection · Clinic access',effect:'Income +4 · Influence +2',landMin:3},
  {income:2,id:'bank',name:'Частный банк',type:'Коммерция',open:6,materials:['Masonry','Masonry','Steel','Steel'],requires:'Land Value 2+ · Road access',effect:'Income +2 · Influence +1 · Banking/Credit action',landMin:2},
  {income:2,id:'club',name:'Ресторан и клуб',type:'Коммерция',open:4,materials:['Lumber','Masonry','Masonry'],requires:'Land Value 2+',effect:'Income +2 · Influence action',landMin:2},
  {income:2,id:'warehouse',name:'Распределительный склад',type:'Логистика',open:4,materials:['Lumber','Lumber','Masonry','Steel'],requires:'Port, Rail или Road access',effect:'Income +2 · Storage +3 · логистический узел'},
  {income:5,id:'factory',name:'Крупная фабрика',type:'Промышленность',open:5,materials:['Lumber','Masonry','Masonry','Steel','Steel'],requires:'Rail или Port access',effect:'Income +5 · большой промышленный проект'},
  {income:0,id:'bureau',name:'Строительное бюро',type:'Коммерция',open:4,materials:['Lumber','Masonry','Steel'],requires:'Road access',effect:'Скидка владельцу · строительное action space'},
  {income:3,id:'insurance',name:'Страховая компания',type:'Коммерция',open:5,materials:['Masonry','Masonry','Steel'],requires:'Land Value 2+',effect:'Income +3 · Influence +1 · страховые действия',landMin:2},
  {income:0,id:'firehouse',name:'Муниципальная пожарная часть',type:'Городская служба',open:3,materials:['Lumber','Masonry','Steel'],requires:'Road access · municipal site',effect:'Fire Protection · Land Value +1 · civic influence'},
  {income:0,id:'clinic',name:'Районная клиника',type:'Городская служба',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Road access',effect:'Clinic access · Land Value +1 · civic influence'},
  {income:0,id:'publicworks',name:'Депо городских работ',type:'Городская служба',open:4,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Road access',effect:'Water/Gas/repair infrastructure · civic influence'},
  {income:0,id:'streetcar',name:'Трамвайное расширение и депо',type:'Инфраструктура',open:4,materials:['Lumber','Masonry','Steel'],requires:'Между связанными районами',effect:'Улучшает перемещение · повышает привлекательность района'}
];

export const DISTRICTS = [
  {id:'pacific',name:'Pacific Heights',hint:'Дорогая земля, мало площадок',landValue:4,sites:3},
  {id:'financial',name:'Financial / Ferry',hint:'Дорогой финансовый и портовый узел',landValue:4,sites:3},
  {id:'civic',name:'Civic Center',hint:'Административный центр и городские службы',landValue:3,sites:3},
  {id:'western',name:'Western Addition',hint:'Средняя стоимость, смешанное развитие',landValue:2,sites:4},
  {id:'soma',name:'SoMa',hint:'Коммерция и промышленность',landValue:2,sites:5},
  {id:'mission',name:'Mission',hint:'Доступная смешанная застройка',landValue:1,sites:5},
  {id:'missionbay',name:'Mission Bay',hint:'Дешёвая земля; rail / port / fill — позже',landValue:1,sites:5},
  {id:'sunset',name:'Western Expansion',hint:'Самая дешёвая земля, слабая инфраструктура',landValue:0,sites:5}
];

export function shuffle(items, rng=Math.random){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

export function projectById(id){return PROJECTS.find(p=>p.id===id) || null;}
export function districtById(id){return DISTRICTS.find(d=>d.id===id) || null;}
export function turnOrder(state){return [0,1,2].map((_,i)=>(state.firstPlayer+i)%3);}
export function currentDeclarer(state){return state.declarationIndex<3?turnOrder(state)[state.declarationIndex]:null;}
export function openingPrice(marketCard){const p=projectById(marketCard.id);return Math.max(1,p.open-(marketCard.discount||0));}
export function emptyMarketCard(id){return {id,age:0,discount:0,claims:[],bids:{},result:null,sold:false};}

export function createInitialState({rng=Math.random}={}){
  const deck=shuffle(PROJECTS.map(p=>p.id),rng);
  const market=deck.splice(0,5).map(emptyMarketCard);
  return {
    version:'0.18',
    round:1,
    firstPlayer:0,
    phase:'declare',
    view:'hall',
    declarationIndex:0,
    players:PLAYER_NAMES.map((name,id)=>({id,name,key:PLAYER_KEYS[id],capital:14,influence:2,workersLeft:3,portfolio:[]})),
    market,
    deck,
    expired:[],
    bidQueue:[],
    bidCursor:0,
    selectedProjectId:market[0]?.id||null,
    selectedDistrictId:'civic',
    pendingConstruction:null,
    constructions:[],
    nextConstructionId:1,
    districts:Object.fromEntries(DISTRICTS.map(d=>[d.id,{landValue:d.landValue,sites:d.sites}])),
    log:[{msg:'Началась тестовая партия Phase I UX v0.18.','cls':'accent'}],
    finished:false
  };
}

export function logEvent(state,msg,cls=''){state.log.push({msg,cls});}

export function claimProject(state,slot){
  if(state.phase!=='declare') return {ok:false,reason:'wrong-phase'};
  const pid=currentDeclarer(state); if(pid==null) return {ok:false,reason:'no-declarer'};
  const m=state.market[slot]; if(!m) return {ok:false,reason:'empty-slot'};
  if(state.market.some(x=>x&&x.claims.some(c=>c.player===pid))) return {ok:false,reason:'already-declared'};
  const price=openingPrice(m);
  if(state.players[pid].capital<price) return {ok:false,reason:'capital'};
  m.claims.push({player:pid,order:state.declarationIndex});
  logEvent(state,`${state.players[pid].name} заявил проект «${projectById(m.id).name}» (opening $${price}).`);
  state.declarationIndex++;
  state.selectedProjectId=m.id;
  return {ok:true};
}

export function passDeclaration(state){
  if(state.phase!=='declare') return {ok:false};
  const pid=currentDeclarer(state); if(pid==null)return {ok:false};
  logEvent(state,`${state.players[pid].name} пасует на City Hall Session.`);
  state.declarationIndex++;
  return {ok:true};
}

export function beginBidding(state){
  if(state.phase!=='declare'||state.declarationIndex<3)return {ok:false};
  state.bidQueue=[];
  state.market.forEach((m,slot)=>{
    if(m&&m.claims.length>1){
      [...m.claims].sort((a,b)=>a.order-b.order).forEach(c=>state.bidQueue.push({slot,player:c.player}));
    }
  });
  state.bidCursor=0;
  state.phase=state.bidQueue.length?'bids':'ready';
  return {ok:true};
}

export function currentBidTask(state){return state.phase==='bids'&&state.bidCursor<state.bidQueue.length?state.bidQueue[state.bidCursor]:null;}

export function submitBid(state,value){
  const q=currentBidTask(state); if(!q)return {ok:false,reason:'no-task'};
  const m=state.market[q.slot], pl=state.players[q.player], min=openingPrice(m);
  const v=Math.floor(Number(value));
  if(!Number.isFinite(v)||v<min||v>pl.capital)return {ok:false,reason:'range',min,max:pl.capital};
  m.bids[q.player]=v;
  logEvent(state,`${pl.name} сделал закрытую ставку на «${projectById(m.id).name}».`);
  state.bidCursor++;
  if(state.bidCursor>=state.bidQueue.length)state.phase='ready';
  return {ok:true};
}

export function resolveTenders(state){
  if(state.phase!=='ready')return {ok:false};
  state.market.forEach(m=>{
    if(!m||!m.claims.length)return;
    const price=openingPrice(m);
    if(m.claims.length===1){
      const pid=m.claims[0].player;
      award(state,m,pid,price,'единственный претендент');
      return;
    }
    const ranked=m.claims.map(c=>({
      player:c.player,
      bid:m.bids[c.player]??price,
      influence:state.players[c.player].influence,
      order:c.order
    })).sort((a,b)=>b.bid-a.bid||b.influence-a.influence||a.order-b.order);
    const w=ranked[0];
    let reason=`ставка $${w.bid}`;
    if(ranked[1]&&w.bid===ranked[1].bid){
      reason += w.influence!==ranked[1].influence?` · Influence ${w.influence}`:' · более ранняя заявка';
    }
    award(state,m,w.player,w.bid,reason);
  });
  state.phase='development';
  logEvent(state,'Тендерная сессия завершена. Игроки переходят к развитию города.','accent');
  return {ok:true};
}

function award(state,m,pid,price,reason){
  const pl=state.players[pid], p=projectById(m.id);
  if(pl.capital<price){m.result='Ошибка: недостаточно капитала';return;}
  pl.capital-=price;
  pl.portfolio.push(m.id);
  m.sold=true;
  m.result={player:pid,price,reason};
  logEvent(state,`${pl.name} получает «${p.name}» за $${price} (${reason}).`,'good');
}

export function districtConstructionCount(state,districtId){
  return (state.constructions||[]).filter(c=>c.districtId===districtId).length;
}

export function constructionEligibility(state,playerId,projectId,districtId){
  const reasons=[];
  const player=state.players[playerId];
  const project=projectById(projectId);
  const district=districtById(districtId);
  const ds=state.districts?.[districtId] || (district?{landValue:district.landValue,sites:district.sites}:null);
  if(state.phase!=='development') reasons.push('Строительство доступно только после тендеров.');
  if(!player||!project||!district||!ds) reasons.push('Недоступный игрок, проект или район.');
  if(player&&project&&!player.portfolio.includes(projectId)) reasons.push('Проекта нет в доступном портфеле игрока.');
  if(player&&(player.workersLeft??0)<=0) reasons.push('Нет свободных представителей в этом раунде.');
  const used=ds?districtConstructionCount(state,districtId):0;
  if(ds&&used>=ds.sites) reasons.push('В районе нет свободных строительных площадок.');
  if(project&&ds&&project.landMin!=null&&ds.landValue<project.landMin) reasons.push(`Требуется Land Value ${project.landMin}+.`);
  if(project&&ds&&project.landMax!=null&&ds.landValue>project.landMax) reasons.push(`Требуется Land Value ≤${project.landMax}.`);
  if(player&&ds&&player.capital<ds.landValue) reasons.push(`Не хватает капитала на землю (${ds.landValue}).`);
  return {
    ok:reasons.length===0,
    reasons,
    cost:ds?.landValue??0,
    landValue:ds?.landValue??0,
    usedSites:used,
    totalSites:ds?.sites??0,
    freeSites:Math.max(0,(ds?.sites??0)-used)
  };
}

export function beginConstruction(state,playerId,projectId,districtId){
  const check=constructionEligibility(state,playerId,projectId,districtId);
  if(!check.ok)return {ok:false,...check};
  const player=state.players[playerId];
  const idx=player.portfolio.indexOf(projectId);
  if(idx<0)return {ok:false,reasons:['Проект уже недоступен.']};
  const construction={
    id:`C${state.nextConstructionId||1}`,
    playerId,projectId,districtId,
    startedRound:state.round,
    status:'under-construction',
    materialsDelivered:[],
    rentedSlots:0,
    completedRound:null
  };
  state.nextConstructionId=(state.nextConstructionId||1)+1;
  player.portfolio.splice(idx,1);
  player.capital-=check.cost;
  player.workersLeft=Math.max(0,(player.workersLeft??0)-1);
  state.constructions=state.constructions||[];
  state.constructions.push(construction);
  state.pendingConstruction=null;
  state.selectedDistrictId=districtId;
  logEvent(state,`${player.name} начал строительство «${projectById(projectId).name}» в ${districtById(districtId).name}: земля ${check.cost}, использован 1 представитель.`,'good');
  return {ok:true,construction,cost:check.cost};
}

export function resourcePrice(type){return RESOURCE_PRICES[type]??null;}

export function projectMaterialCounts(projectId){
  const project=projectById(projectId);
  if(!project)return {};
  return project.materials.reduce((acc,x)=>{acc[x]=(acc[x]||0)+1;return acc;},{});
}

export function deliveredMaterialCounts(construction){
  return (construction?.materialsDelivered||[]).reduce((acc,x)=>{acc[x]=(acc[x]||0)+1;return acc;},{});
}

export function completedWarehouseCount(state,playerId,districtId){
  return (state.constructions||[]).filter(c=>
    c.playerId===playerId&&c.districtId===districtId&&c.projectId==='warehouse'&&c.status==='complete'
  ).length;
}

export function warehouseCapacityBonus(state,playerId,districtId){
  return completedWarehouseCount(state,playerId,districtId)*3;
}

export function constructionCapacity(state,construction){
  if(!construction)return 0;
  return 3+warehouseCapacityBonus(state,construction.playerId,construction.districtId)+(construction.rentedSlots||0);
}

export function constructionProgress(state,constructionId){
  const construction=(state.constructions||[]).find(c=>c.id===constructionId);
  if(!construction)return null;
  const project=projectById(construction.projectId);
  const required=project?.materials?.length||0;
  const delivered=(construction.materialsDelivered||[]).length;
  return {
    construction,project,required,delivered,
    capacity:constructionCapacity(state,construction),
    complete:construction.status==='complete',
    remaining:Math.max(0,required-delivered)
  };
}

export function canRentOverflow(state,constructionId){
  const progress=constructionProgress(state,constructionId);
  if(!progress)return {ok:false,reason:'not-found'};
  const {construction,project}=progress;
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if(construction.status!=='under-construction')return {ok:false,reason:'complete'};
  const player=state.players[construction.playerId];
  const permanent=3+warehouseCapacityBonus(state,construction.playerId,construction.districtId);
  const maxRental=Math.max(0,project.materials.length-permanent);
  if((construction.rentedSlots||0)>=maxRental)return {ok:false,reason:'not-needed'};
  if(player.capital<1)return {ok:false,reason:'capital'};
  return {ok:true,cost:1,maxRental,permanent};
}

export function rentOverflowSlot(state,constructionId){
  const check=canRentOverflow(state,constructionId);
  if(!check.ok)return check;
  const construction=state.constructions.find(c=>c.id===constructionId);
  const player=state.players[construction.playerId];
  player.capital-=1;
  construction.rentedSlots=(construction.rentedSlots||0)+1;
  logEvent(state,`${player.name} арендует 1 временный слот хранения для «${projectById(construction.projectId).name}» за $1.`);
  return {ok:true,cost:1,capacity:constructionCapacity(state,construction)};
}

export function canDeliverMaterial(state,constructionId,type){
  const progress=constructionProgress(state,constructionId);
  if(!progress)return {ok:false,reason:'not-found'};
  const {construction,project,capacity,delivered}=progress;
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if(construction.status!=='under-construction')return {ok:false,reason:'complete'};
  const price=resourcePrice(type);
  if(price==null)return {ok:false,reason:'bad-resource'};
  const required=projectMaterialCounts(project.id);
  const have=deliveredMaterialCounts(construction);
  if((have[type]||0)>=(required[type]||0))return {ok:false,reason:'not-needed'};
  if(delivered>=capacity)return {ok:false,reason:'capacity'};
  const player=state.players[construction.playerId];
  if(player.capital<price)return {ok:false,reason:'capital',cost:price};
  return {ok:true,cost:price};
}

export function completeConstruction(state,construction){
  if(!construction||construction.status!=='under-construction')return {ok:false};
  const project=projectById(construction.projectId);
  if((construction.materialsDelivered||[]).length<project.materials.length)return {ok:false};
  construction.status='complete';
  construction.completedRound=state.round;
  const player=state.players[construction.playerId];
  logEvent(state,`${player.name} завершил «${project.name}» в ${districtById(construction.districtId).name}.`,'good');
  return {ok:true};
}

export function deliverMaterial(state,constructionId,type){
  const check=canDeliverMaterial(state,constructionId,type);
  if(!check.ok)return check;
  const construction=state.constructions.find(c=>c.id===constructionId);
  const player=state.players[construction.playerId];
  player.capital-=check.cost;
  construction.materialsDelivered=construction.materialsDelivered||[];
  construction.materialsDelivered.push(type);
  logEvent(state,`${player.name} доставил ${type} на «${projectById(construction.projectId).name}» за ${check.cost}.`);
  const project=projectById(construction.projectId);
  let completed=false;
  if(construction.materialsDelivered.length===project.materials.length){
    completed=completeConstruction(state,construction).ok;
  }
  return {ok:true,cost:check.cost,completed,progress:constructionProgress(state,constructionId)};
}

export function buildingIncome(state,playerId){
  return (state.constructions||[]).filter(c=>c.playerId===playerId&&c.status==='complete')
    .reduce((sum,c)=>sum+(projectById(c.projectId)?.income||0),0);
}

export function roundIncome(state,playerId){
  return BASE_ROUND_INCOME+buildingIncome(state,playerId);
}

export function setLandValue(state,districtId,value){
  const district=districtById(districtId);
  if(!district||!state.districts?.[districtId])return {ok:false};
  const v=Math.max(0,Math.min(6,Math.floor(Number(value))));
  if(!Number.isFinite(v))return {ok:false};
  state.districts[districtId].landValue=v;
  return {ok:true,value:v};
}

export function cleanupMarket(state){
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  const remaining=state.market.filter(m=>m&&!m.sold);
  const old=remaining.filter(m=>m.age===1);
  old.forEach(m=>{state.expired.push(m.id);logEvent(state,`«${projectById(m.id).name}» сгорел: последний шанс истёк.`,'bad');});
  const fresh=remaining.filter(m=>m.age===0);
  const survivors=fresh.slice(0,2);
  fresh.slice(2).forEach(m=>{state.expired.push(m.id);logEvent(state,`«${projectById(m.id).name}» сброшен с правого края рынка.`,'bad');});
  survivors.forEach(m=>{m.age=1;m.discount=1;m.claims=[];m.bids={};m.result=null;m.sold=false;});

  if(state.round>=MAX_ROUNDS){
    state.finished=true;state.phase='finished';
    state.market=[...survivors];
    logEvent(state,'Тест Phase I завершён после 3 раундов.','accent');
    return {ok:true,finished:true};
  }

  state.players.forEach(p=>{
    const amount=roundIncome(state,p.id);
    p.capital+=amount;
    logEvent(state,`${p.name} получает доход ${amount} (${BASE_ROUND_INCOME} базовый + ${buildingIncome(state,p.id)} здания).`,'good');
  });

  const needed=5-survivors.length;
  const incoming=[];
  while(incoming.length<needed&&state.deck.length)incoming.push(emptyMarketCard(state.deck.shift()));
  const blanks=Array(Math.max(0,5-incoming.length-survivors.length)).fill(null);
  state.market=[...incoming,...blanks,...survivors];
  state.round++;
  state.firstPlayer=(state.firstPlayer+1)%3;
  state.players.forEach(p=>p.workersLeft=3);
  state.phase='declare';state.view='hall';state.declarationIndex=0;state.bidQueue=[];state.bidCursor=0;
  state.market.forEach(m=>{if(m){m.claims=[];m.bids={};m.result=null;m.sold=false;}});
  state.selectedProjectId=state.market.find(Boolean)?.id||null;
  logEvent(state,`Раунд ${state.round}. Первый игрок: ${state.players[state.firstPlayer].name}. Старые проекты сдвинуты вправо и стоят на $1 дешевле.`,'accent');
  return {ok:true,finished:false};
}

export function tenderSummary(state){
  return state.market.filter(Boolean).map(m=>({
    id:m.id,
    price:openingPrice(m),
    age:m.age,
    claims:m.claims.map(c=>c.player),
    sold:m.sold,
    result:m.result
  }));
}
