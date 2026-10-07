import {NEWS_CARDS,newsCard,newsYear} from './newspaper-cards.js';

export const PLAYER_NAMES = ['Синий','Красный','Зелёный'];
export const PLAYER_KEYS = ['blue','red','green'];
export const MAX_ROUNDS = 6;
export const RESOURCE_PRICES = {Lumber:1,Masonry:1,Steel:2};
export const BASE_ROUND_INCOME = 3;
export const RAISE_CAPITAL_AMOUNT = 3;
export const LOAN_PRINCIPAL = 6;
export const MAX_ACTIVE_LOANS = 2;
export const BUREAU_LAND_DISCOUNT = 2;
export const HAND_LIMIT = 5;
export const STARTER_DRAFT_SIZE = 5;
export const STARTER_KEEP = 2;
export const WORKERS_PER_PLAYER = 3;
export const STARTING_WORKER_DISTRICT = 'civic';
export const PROJECT_COPIES = 3;
export const LAND_VALUE_COMPLETION_CHANGE = {factory:-1,firehouse:1,clinic:1,police:1,publicworks:1,streetcar:1};
export const BUILDING_TYPES = Object.freeze(['Жилое','Бизнес','Промышленное','Общественное','Торговое']);
export const MARKET_STREET_DISTRICTS = Object.freeze(['noe','mission','civic','soma','financial']);
export const POOR_GROUND_DISTRICTS = Object.freeze(['marina','financial','soma','mission','missionbay']);
export const STABLE_GROUND_DISTRICTS = Object.freeze(['pacific','chinatown']);

export const LOGISTICS_RESOURCE_WEIGHTS = {Lumber:0.40,Masonry:0.35,Steel:0.25};
export const CONSTRUCTION_STAGING_CAPACITY = 3;
export const WAREHOUSE_STORAGE_CAPACITY = 5;
export const FREIGHT_YARD = {id:'freightyard',name:'Городской грузовой двор',shortName:'Грузовой двор',districtId:'western',capacityPerPlayer:2,rentCost:2,x:570,y:375};
export const DELIVERY_EDGE_COST = 1;
export const DELIVERY_HAULERS = [
  {id:'dray2a',name:'Малая подвода A',capacity:2,baseCost:0,limited:true},
  {id:'dray2b',name:'Малая подвода B',capacity:2,baseCost:0,limited:true},
  {id:'wagon3a',name:'Стандартная повозка A',capacity:3,baseCost:1,limited:true},
  {id:'wagon3b',name:'Стандартная повозка B',capacity:3,baseCost:1,limited:true},
  {id:'heavy4',name:'Тяжёлая повозка',capacity:4,baseCost:2,limited:true},
  {id:'freight5',name:'Грузовая повозка',capacity:5,baseCost:3,limited:true},
  {id:'standard',name:'Обычный перевозчик',capacity:3,baseCost:3,limited:false}
];

export const LOGISTICS_NODES = [
  {id:'broadway',name:'Broadway Wharf',shortName:'Broadway Wharf',districtId:'northbeach',kind:'port',throughput:3,x:1048,y:195,weights:{Lumber:0.60,Masonry:0.30,Steel:0.10},profile:'Дерево'},
  {id:'pacificmail',name:'Pacific Mail / Pier 40',shortName:'Pacific Mail',districtId:'soma',kind:'rail-port',throughput:4,x:1195,y:525,weights:{Lumber:0.40,Masonry:0.40,Steel:0.20},profile:'Смешанный импорт'},
  {id:'southernpacific',name:'Southern Pacific · Third & Townsend',shortName:'SP · 3rd & Townsend',districtId:'soma',kind:'rail',throughput:4,x:1052,y:560,weights:{Lumber:0.40,Masonry:0.35,Steel:0.25},profile:'Универсальный ж/д'},
  {id:'chinabasin',name:'China Basin / ATSF',shortName:'China Basin',districtId:'missionbay',kind:'rail-port',throughput:4,x:1225,y:625,weights:{Lumber:0.35,Masonry:0.40,Steel:0.25},profile:'Промышленный смешанный'},
  {id:'unioniron',name:'Union Iron Works / Potrero Point',shortName:'Union Iron Works',districtId:'potrero',kind:'industrial-rail-port',throughput:2,x:1222,y:850,weights:{Lumber:0.20,Masonry:0.25,Steel:0.55},profile:'Сталь'}
];

export function randomLogisticsResource(rng=Math.random,weights=LOGISTICS_RESOURCE_WEIGHTS){
  const roll=rng();
  if(roll<weights.Lumber)return 'Lumber';
  if(roll<weights.Lumber+weights.Masonry)return 'Masonry';
  return 'Steel';
}

export function generateLogisticsSupply({rng=Math.random}={}){
  return Object.fromEntries(LOGISTICS_NODES.map(node=>[
    node.id,
    Array.from({length:node.throughput},()=>randomLogisticsResource(rng,node.weights||LOGISTICS_RESOURCE_WEIGHTS))
  ]));
}

export function refreshLogisticsSupply(state,{rng=Math.random}={}){
  state.logisticsSupply=generateLogisticsSupply({rng});
  return state.logisticsSupply;
}

export const PROJECTS = [
  {prestige:1,income:2,id:'tenement',types:["Жилое"],risk:{earthquake:0,fire:1},name:'Рабочий доходный дом',type:'Жильё',open:2,materials:['Lumber','Lumber','Masonry'],requires:'Нет дополнительных требований',effect:'Доход +2 · много жителей · Престиж +1',benefit:'Доход +2 / раунд · Престиж +1 · много жителей',actionName:'—',actionText:'Отдельного действия нет.',limits:'Нет дополнительных ограничений.'},
  {prestige:0,income:3,id:'speculative',types:["Жилое"],risk:{earthquake:1,fire:1},name:'Спекулятивный жилой комплекс',type:'Жильё',open:3,materials:['Lumber','Lumber','Lumber'],requires:'Стоимость земли ≤2',effect:'Доход +3 · очень много жителей · высокий риск',landMax:2,benefit:'Доход +3 / раунд · Престиж 0 · очень много жителей',actionName:'—',actionText:'Отдельного действия нет.',limits:'Только Стоимость земли ≤2. Высокий риск в будущей катастрофе.'},
  {prestige:3,income:3,id:'luxury',types:["Жилое"],risk:{earthquake:0,fire:0},name:'Роскошные апартаменты',type:'Жильё',open:5,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Стоимость земли 3+ · Пожарная защита',accessAll:['fire'],effect:'Доход +3 · Престиж +3',landMin:3,benefit:'Доход +3 / раунд · Престиж +3',actionName:'—',actionText:'Отдельного действия нет.',limits:'Стоимость земли 3+ и Пожарная защита.'},
  {prestige:1,income:2,id:'shops',types:["Торговое"],risk:{earthquake:0,fire:1},name:'Торговый ряд',type:'Коммерция',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Стоимость земли 1+',effect:'Доход +2 · Действие «Закупка» · Престиж +1',landMin:1,benefit:'Доход +2 / раунд · Престиж +1',actionName:'Закупка',actionText:'1 представитель + $1 → до 2 материалов по $0 в следующих Доставка этой активации.',limits:'Нужна незавершённая стройка · 1 использование / здание / раунд · при чужом использовании $1 получает владелец.'},
  {prestige:3,income:4,id:'hotel',types:["Бизнес"],risk:{earthquake:0,fire:0},name:'Гранд-отель',type:'Коммерция',open:6,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Стоимость земли 3+ · Пожарная защита · Доступ к клинике',accessAll:['fire','clinic'],effect:'Доход +4 · Престиж +3',landMin:3,benefit:'Доход +4 / раунд · Престиж +3',actionName:'—',actionText:'Отдельного действия нет.',limits:'Стоимость земли 3+ · Пожарная защита · Доступ к клинике.'},
  {prestige:1,income:2,id:'bank',types:["Бизнес"],risk:{earthquake:0,fire:0},name:'Частный банк',type:'Коммерция',open:6,materials:['Masonry','Masonry','Steel','Steel'],requires:'Стоимость земли 2+',effect:'Доход +2 · Действие «Банковский кредит» · Престиж +1',landMin:2,benefit:'Доход +2 / раунд · Престиж +1',actionName:'Банковский кредит',actionText:'1 представитель → 1-й активный кредит +$6; 2-й +$5. Каждый кредит: долг $6 и −$1 к Доход.',limits:'Макс. 2 активных кредита · 1 использование / банк / раунд · чужое использование даёт владельцу +1 Влияние максимум 1×/round.'},
  {prestige:2,income:2,id:'club',types:["Бизнес","Торговое"],risk:{earthquake:0,fire:1},name:'Ресторан и клуб',type:'Коммерция',open:4,materials:['Lumber','Masonry','Masonry'],requires:'Стоимость земли 2+',effect:'Доход +2 · Действие «Ужин и связи» · Престиж +2',landMin:2,benefit:'Доход +2 / раунд · Престиж +2',actionName:'Ужин и связи',actionText:'1 представитель + $1 → +1 Влияние.',limits:'1 использование / здание / раунд · если использует соперник, его $1 получает владелец.'},
  {prestige:1,income:2,id:'warehouse',types:["Торговое"],risk:{earthquake:0,fire:1},name:'Распределительный склад',type:'Логистика',open:4,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Доход +2 · Хранение 5 · Престиж +1',benefit:'Доход +2 / раунд · Престиж +1 · хранит до 5 ресурсов и снабжает стройки в этом районе',actionName:'—',actionText:'Может быть источником и точкой разгрузки Доставка.',limits:'Хранение 5 ресурсов.'},
  {prestige:0,income:5,id:'factory',types:["Промышленное"],risk:{earthquake:1,fire:2},name:'Крупная фабрика',type:'Промышленность',open:5,materials:['Lumber','Masonry','Masonry','Steel','Steel'],requires:'Доступ к ж/д или порту',accessAny:['rail','port'],effect:'Доход +5 · Стоимость земли −1',benefit:'Доход +5 / раунд · Престиж 0 · после завершения Стоимость земли района −1',actionName:'—',actionText:'Отдельного действия нет.',limits:'Только Доступ к ж/д или порту. Стоимость земли не падает ниже 0.'},
  {prestige:1,income:0,id:'bureau',types:["Бизнес"],risk:{earthquake:0,fire:0},name:'Строительное бюро',type:'Коммерция',open:4,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Строительный контракт · −$2 к Стоимость земли · Престиж +1',benefit:'Престиж +1 · Доход 0',actionName:'Строительный контракт',actionText:'1 представитель → следующая платная земля дешевле до $2.',limits:'Макс. 1 сохранённый контракт · 1 использование / здание / раунд · чужое использование приносит владельцу $1.'},
  {prestige:1,income:3,id:'insurance',types:["Бизнес"],risk:{earthquake:0,fire:0},name:'Страховая компания',type:'Коммерция',open:5,materials:['Masonry','Masonry','Steel'],requires:'Стоимость земли 2+',effect:'Доход +3 · Престиж +1 · страховые действия позже',landMin:2,benefit:'Доход +3 / раунд · Престиж +1',actionName:'Страхование',actionText:'Страховое действие ещё не активно в текущем прототипе.',limits:'Стоимость земли 2+. Механика страхования будет добавлена позже.'},
  {prestige:3,income:0,id:'firehouse',types:["Общественное"],risk:{earthquake:0,fire:-1},name:'Муниципальная пожарная часть',type:'Городская служба',open:3,materials:['Lumber','Masonry','Steel'],requires:'Муниципальный участок',effect:'Пожарная защита (район + соседний район) · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · Пожарная защита',actionName:'—',actionText:'Отдельного действия пока нет.',limits:'Пожарная защита действует в своём и соседнем районе. Municipal site пока не проверяется.'},
  {prestige:3,income:0,id:'police',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Городской полицейский участок',type:'Городская служба',open:3,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Обеспечивает общественный порядок в районе и соседних районах · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · предотвращает события преступности в своём и соседних районах',actionName:'—',actionText:'Автоматическая защита от криминальных событий, без дополнительного действия.',limits:'Не суммируется с защитой другого участка, не защищает от землетрясения.'},
  {prestige:3,income:0,id:'clinic',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Районная клиника',type:'Городская служба',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Нет дополнительных требований',effect:'Доступ к клинике (район + соседний район) · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · Доступ к клинике',actionName:'—',actionText:'Отдельного действия пока нет.',limits:'Доступ к клинике действует в своём и соседнем районе.'},
  {prestige:3,income:0,id:'publicworks',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Депо городских работ',type:'Городская служба',open:4,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Инфраструктура воды / газа / ремонта · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · Инфраструктура воды / газа / ремонта',actionName:'—',actionText:'Отдельное действие ещё не активно.',limits:'Полные воды / газа / ремонта правила будут добавлены позже.'},
  {prestige:3,income:0,id:'streetcar',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Трамвайное расширение и депо',type:'Инфраструктура',open:4,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',streetcarExtension:true,effect:'Трамвайное расширение · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · трамвайная инфраструктура',actionName:'—',actionText:'Связь с Market Street будет доступна через исследование электрификации.',limits:'Нет дополнительных ограничений.'}
]

export const DISTRICTS = [
  {id:'presidio',earthquakeBase:0,fireBase:0,name:'Presidio',hint:'Федеральная территория · закрыто для строительства и передвижения',landValue:0,sites:0,road:false,rail:false,port:false,buildable:false,passable:false},
  {id:'marina',earthquakeBase:2,fireBase:0,soilClass:'poor',name:'Marina',hint:'Северная набережная · дорогая земля · Порт · неблагоприятный насыпной грунт',landValue:3,sites:5,road:true,rail:false,port:true,buildable:true,passable:true},
  {id:'northbeach',earthquakeBase:0,fireBase:1,name:'North Beach',hint:'Плотная северо-восточная застройка · Порт',landValue:3,sites:5,road:true,rail:false,port:true,buildable:true,passable:true},
  {id:'chinatown',earthquakeBase:0,fireBase:1,soilClass:'stable',name:'Chinatown',hint:'Плотный центральный район',landValue:3,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'pacific',earthquakeBase:0,fireBase:0,soilClass:'stable',name:'Pacific Heights',hint:'Самая дорогая жилая земля',landValue:4,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'financial',earthquakeBase:1,fireBase:1,soilClass:'poor',name:'Financial District',hint:'Дорогой финансовый и портовый узел',landValue:4,sites:5,road:true,rail:false,port:true,buildable:true,passable:true},
  {id:'soma',earthquakeBase:1,fireBase:1,soilClass:'poor',name:'SoMa',hint:'Промышленный район · Ж/д + порт',landValue:2,sites:5,road:true,rail:true,port:true,buildable:true,passable:true},
  {id:'civic',earthquakeBase:0,fireBase:0,name:'Civic Center',hint:'Административный центр и городские службы',landValue:3,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'western',earthquakeBase:0,fireBase:0,name:'Western Addition',hint:'Средняя стоимость · развитая уличная сеть',landValue:2,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'innerrichmond',earthquakeBase:0,fireBase:0,name:'Inner Richmond',hint:'Западный жилой район рядом с Golden Gate Park',landValue:2,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'outerrichmond',earthquakeBase:0,fireBase:0,name:'Outer Richmond',hint:'Доступная западная земля',landValue:1,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'haight',earthquakeBase:0,fireBase:0,name:'Haight-Ashbury',hint:'Средняя стоимость · центрально-западный узел',landValue:2,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'innersunset',earthquakeBase:0,fireBase:0,name:'Inner Sunset',hint:'Доступная земля к югу от Golden Gate Park',landValue:1,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'sunset',earthquakeBase:0,fireBase:0,name:'Outer Sunset',hint:'Самая дешёвая западная периферия',landValue:0,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'mission',earthquakeBase:1,fireBase:1,soilClass:'poor',name:'Mission',hint:'Доступная плотная застройка · доступ к ж/д',landValue:1,sites:5,road:true,rail:true,port:false,buildable:true,passable:true},
  {id:'missionbay',earthquakeBase:2,fireBase:0,soilClass:'poor',name:'Mission Bay',hint:'Дешёвая земля · Ж/д + порт · насыпной грунт',landValue:1,sites:5,road:true,rail:true,port:true,buildable:true,passable:true},
  {id:'potrero',earthquakeBase:1,fireBase:0,name:'Potrero',hint:'Доступная промышленная земля · Ж/д + порт',landValue:1,sites:5,road:true,rail:true,port:true,buildable:true,passable:true},
  {id:'noe',earthquakeBase:0,fireBase:0,name:'Noe Valley',hint:'Средняя стоимость · южный жилой район',landValue:2,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'bernal',earthquakeBase:0,fireBase:0,name:'Bernal Heights',hint:'Доступная южная земля',landValue:1,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'park',earthquakeBase:0,fireBase:0,name:'Golden Gate Park',hint:'Строительство запрещено · рабочие могут проходить через парк',landValue:0,sites:0,road:false,rail:false,port:false,buildable:false,passable:true},
  {id:'twinpeaks',earthquakeBase:0,fireBase:0,name:'Twin Peaks',hint:'Закрыто для строительства и передвижения',landValue:0,sites:0,road:false,rail:false,port:false,buildable:false,passable:false}
];

export const DISTRICT_ADJACENCY = {
  presidio:['outerrichmond','innerrichmond','western','pacific','marina'],
  marina:['presidio','pacific','northbeach'],
  northbeach:['marina','pacific','chinatown','financial'],
  chinatown:['northbeach','financial','pacific'],
  pacific:['presidio','marina','northbeach','chinatown','financial','civic','western'],
  financial:['northbeach','chinatown','pacific','civic','soma'],
  soma:['financial','civic','mission','missionbay'],
  civic:['pacific','western','financial','soma','haight','mission'],
  western:['presidio','innerrichmond','pacific','civic','haight','park'],
  innerrichmond:['presidio','outerrichmond','western','park'],
  outerrichmond:['presidio','innerrichmond','park'],
  haight:['park','western','civic','innersunset','mission'],
  innersunset:['park','sunset','haight','mission','noe','twinpeaks'],
  sunset:['park','innersunset','twinpeaks'],
  mission:['soma','civic','haight','innersunset','noe','bernal','missionbay','potrero'],
  missionbay:['soma','mission','potrero'],
  potrero:['missionbay','mission','bernal'],
  noe:['innersunset','mission','bernal','twinpeaks'],
  bernal:['mission','noe','potrero'],
  park:['outerrichmond','innerrichmond','western','haight','innersunset','sunset'],
  twinpeaks:['innersunset','sunset','noe']
}

export function shuffle(items, rng=Math.random){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

export function projectById(id){return PROJECTS.find(p=>p.id===id) || null;}
export function projectTypes(projectOrId){
  const project=typeof projectOrId==='string'?projectById(projectOrId):projectOrId;
  return Array.isArray(project?.types)&&project.types.length?[...project.types]:[];
}
export function districtById(id){return DISTRICTS.find(d=>d.id===id) || null;}
export function districtNeighbors(id){return [...(DISTRICT_ADJACENCY[id]||[])];}
export function districtHasMarketStreet(id){return MARKET_STREET_DISTRICTS.includes(id);}
export function districtSoilClass(id){return districtById(id)?.soilClass||'normal';}

export function projectRisk(projectId){
  const project=projectById(projectId);
  return {
    earthquake:Number(project?.risk?.earthquake)||0,
    fire:Number(project?.risk?.fire)||0
  };
}
export function riskLevel(value){
  const raw=Math.max(0,Math.floor(Number(value)||0));
  return raw===0?0:raw===1?1:raw===2?2:3;
}
export function districtRisk(state,districtId){
  const district=districtById(districtId);
  if(!district)return null;
  const earthquakeBase=Math.max(0,Math.floor(Number(district.earthquakeBase)||0));
  const fireBase=Math.max(0,Math.floor(Number(district.fireBase)||0));
  const sources=[];
  if(earthquakeBase||fireBase)sources.push({kind:'base',label:'Базовая уязвимость района',earthquake:earthquakeBase,fire:fireBase});
  for(const construction of state?.constructions||[]){
    if(construction.districtId!==districtId||construction.status!=='complete')continue;
    const delta=projectRisk(construction.projectId);
    if(!delta.earthquake&&!delta.fire)continue;
    const project=projectById(construction.projectId);
    sources.push({kind:'project',constructionId:construction.id,projectId:construction.projectId,ownerId:construction.playerId,label:project?.name||construction.projectId,earthquake:delta.earthquake,fire:delta.fire});
  }
  const projectSources=sources.filter(x=>x.kind==='project');
  const earthquakeNet=earthquakeBase+projectSources.reduce((sum,x)=>sum+x.earthquake,0);
  const fireNet=fireBase+projectSources.reduce((sum,x)=>sum+x.fire,0);
  const earthquakeRaw=Math.max(0,earthquakeNet);
  const fireRaw=Math.max(0,fireNet);
  return {districtId,earthquake:{raw:earthquakeRaw,net:earthquakeNet,level:riskLevel(earthquakeRaw),base:earthquakeBase},fire:{raw:fireRaw,net:fireNet,level:riskLevel(fireRaw),base:fireBase},sources};
}
export function districtRiskPreview(state,districtId,projectId){
  const before=districtRisk(state,districtId);
  if(!before)return null;
  const delta=projectRisk(projectId);
  const earthquakeRaw=Math.max(0,(before.earthquake.net??before.earthquake.raw)+delta.earthquake);
  const fireRaw=Math.max(0,(before.fire.net??before.fire.raw)+delta.fire);
  return {before,delta,after:{earthquake:{raw:earthquakeRaw,level:riskLevel(earthquakeRaw)},fire:{raw:fireRaw,level:riskLevel(fireRaw)}}};
}

export function createWorkers(playerId,{districtId=STARTING_WORKER_DISTRICT}={}){
  return Array.from({length:WORKERS_PER_PLAYER},(_,i)=>({
    id:`P${playerId+1}W${i+1}`,
    number:i+1,
    districtId,
    used:false
  }));
}
export function playerWorkers(state,playerId){return state.players?.[playerId]?.workers||[];}
export function availableWorkers(state,playerId){return playerWorkers(state,playerId).filter(w=>!w.used);}
export function activeWorker(state,playerId){
  const id=state.activeWorkerId;
  if(!id)return null;
  const worker=playerWorkers(state,playerId).find(w=>w.id===id);
  return worker&&!worker.used?worker:null;
}
export function workerCanReachDistrict(state,playerId,targetDistrictId,workerId=null){
  const worker=workerId?playerWorkers(state,playerId).find(w=>w.id===workerId):activeWorker(state,playerId);
  const target=districtById(targetDistrictId);
  if(!worker||worker.used||!target||target.passable===false)return false;
  const local=worker.districtId===targetDistrictId||districtNeighbors(worker.districtId).includes(targetDistrictId);
  const marketStreet=districtHasMarketStreet(worker.districtId)&&districtHasMarketStreet(targetDistrictId);
  return local||marketStreet;
}
export function workerReachableDistricts(state,playerId,workerId=null){
  const worker=workerId?playerWorkers(state,playerId).find(w=>w.id===workerId):activeWorker(state,playerId);
  if(!worker||worker.used)return [];
  const ids=[worker.districtId,...districtNeighbors(worker.districtId)];
  if(districtHasMarketStreet(worker.districtId))ids.push(...MARKET_STREET_DISTRICTS);
  return [...new Set(ids)].filter(id=>districtById(id)?.passable!==false);
}
export function selectWorker(state,playerId,workerId){
  if(state.phase!=='development'||state.developmentComplete)return {ok:false,reason:'wrong-phase'};
  if(currentDeveloper(state)!==playerId)return {ok:false,reason:'turn'};
  if(state.activationMainActionUsed)return {ok:false,reason:'main-used'};
  const worker=playerWorkers(state,playerId).find(w=>w.id===workerId);
  if(!worker)return {ok:false,reason:'worker'};
  if(worker.used)return {ok:false,reason:'used'};
  state.activeWorkerId=worker.id;
  return {ok:true,worker};
}
function syncWorkersLeft(state,playerId){
  const player=state.players[playerId];
  if(!player)return 0;
  player.workersLeft=availableWorkers(state,playerId).length;
  return player.workersLeft;
}
function workerMovementText(consumed){
  if(!consumed?.worker)return '';
  const from=districtById(consumed.from)?.name||consumed.from;
  const to=districtById(consumed.to)?.name||consumed.to;
  return consumed.moved
    ? ` Представитель #${consumed.worker.number}: ${from} → ${to}.`
    : ` Представитель #${consumed.worker.number} остаётся в ${to}.`;
}

export function districtRoadAccess(state,districtId){
  const d=districtById(districtId);
  return !!d&&d.buildable!==false;
}
export function serviceSources(state,districtId,serviceProjectId){
  const eligible=new Set([districtId,...districtNeighbors(districtId)]);
  return (state.constructions||[]).filter(c=>
    c.status==='complete'&&c.projectId===serviceProjectId&&eligible.has(c.districtId)
  );
}
export function districtAccess(state,districtId){
  const d=districtById(districtId);
  if(!d)return {road:false,rail:false,port:false,fire:false,clinic:false,police:false,fireSources:[],clinicSources:[],policeSources:[]};
  const fireSources=serviceSources(state,districtId,'firehouse');
  const clinicSources=serviceSources(state,districtId,'clinic');
  const policeSources=serviceSources(state,districtId,'police');
  return {
    road:districtRoadAccess(state,districtId),
    rail:!!d.rail,
    port:!!d.port,
    fire:fireSources.length>0,
    clinic:clinicSources.length>0,
    police:policeSources.length>0,
    fireSources,
    clinicSources,
    policeSources
  };
}
export function canPlaceStreetcar(state,districtId){
  return districtById(districtId)?.buildable!==false;
}
export function turnOrder(state){return [0,1,2].map((_,i)=>(state.firstPlayer+i)%3);}
export function currentDeclarer(state){return state.declarationIndex<3?turnOrder(state)[state.declarationIndex]:null;}
export function currentDeveloper(state){return state.phase==='development'&&!state.developmentComplete?state.developmentPlayer:null;}
export function activeLoans(state,playerId){return state.players[playerId]?.loans||[];}
export function loanInterest(state,playerId){return activeLoans(state,playerId).length;}
export function completedActionSpaces(state,projectId){
  return (state.constructions||[]).filter(c=>c.projectId===projectId&&c.status==='complete');
}
export function canTakeMainAction(state,playerId){
  const worker=activeWorker(state,playerId);
  return state.phase==='development'&&!state.developmentComplete&&currentDeveloper(state)===playerId
    &&(state.players[playerId]?.workersLeft??0)>0&&!state.activationMainActionUsed&&!!worker;
}
export function canUseFreeAction(state,playerId){
  return state.phase==='development'&&!state.developmentComplete&&currentDeveloper(state)===playerId;
}

export function consumeMainAction(state,playerId,targetDistrictId=null){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:'main-action-unavailable'};
  const worker=activeWorker(state,playerId);
  if(targetDistrictId&&!workerCanReachDistrict(state,playerId,targetDistrictId,worker.id)){
    return {ok:false,reason:'worker-range',worker,targetDistrictId};
  }
  const from=worker.districtId;
  if(targetDistrictId)worker.districtId=targetDistrictId;
  worker.used=true;
  const workersLeft=syncWorkersLeft(state,playerId);
  state.activationMainActionUsed=true;
  return {ok:true,workersLeft,worker,from,to:worker.districtId,moved:from!==worker.districtId};
}

export function endActivation(state,playerId){
  if(state.phase!=='development'||state.developmentComplete)return {ok:false,reason:'wrong-phase'};
  if(currentDeveloper(state)!==playerId)return {ok:false,reason:'turn'};
  if(!state.activationMainActionUsed)return {ok:false,reason:'main-action-required'};
  const player=state.players[playerId];
  if((state.procurementRemaining||0)>0){
    logEvent(state,`${player.name} завершает Procurement; неиспользовано материалов: ${state.procurementRemaining}.`);
  }
  state.procurementRemaining=0;
  state.procurementSource=null;
  state.activeWorkerId=null;
  state.pendingWorkerAction=null;
  if(state.players.every(p=>(p.workersLeft??0)<=0)){
    state.developmentPlayer=null;
    state.activationMainActionUsed=false;
    state.developmentComplete=true;
    logEvent(state,'Все представители использованы. Development Phase можно завершить.','accent');
    return {ok:true,complete:true,nextPlayer:null};
  }
  for(let step=1;step<=state.players.length;step++){
    const pid=(playerId+step)%state.players.length;
    if((state.players[pid].workersLeft??0)>0){
      state.developmentPlayer=pid;
      state.activationMainActionUsed=false;
      logEvent(state,`${player.name} завершает активацию. Следующий: ${state.players[pid].name}.`);
      return {ok:true,complete:false,nextPlayer:pid};
    }
  }
  return {ok:false,reason:'no-next-player'};
}

export function actionSpaceOccupant(state,constructionId){
  const value=state.actionSpaceOccupancy?.[constructionId];
  return value==null?null:value;
}
export function openingPrice(marketCard){const p=projectById(marketCard.id);return Math.max(1,p.open-(marketCard.discount||0));}
export function emptyMarketCard(card){
  const data=typeof card==='string'?{uid:`legacy-${card}`,id:card}:card;
  return {uid:data.uid,id:data.id,age:0,discount:0,claims:[],bids:{},result:null,sold:false};
}
export function createProjectCardPool({rng=Math.random}={}){
  const cards=[];let serial=1;
  for(let copy=0;copy<PROJECT_COPIES;copy++)for(const project of PROJECTS)cards.push({uid:`PC${serial++}`,id:project.id});
  return shuffle(cards,rng);
}
export function currentDraftPlayer(state){return state.phase==='draft'?state.starterDraftPlayer:null;}
export function toggleStarterDraftCard(state,uid){
  if(state.phase!=='draft'||!state.draftRevealed)return {ok:false,reason:'draft-hidden'};
  const pid=currentDraftPlayer(state),hand=state.starterDraftHands?.[pid]||[];
  if(!hand.some(card=>card.uid===uid))return {ok:false,reason:'not-in-hand'};
  state.draftSelection=state.draftSelection||[];
  if(state.draftSelection.includes(uid)){state.draftSelection=state.draftSelection.filter(x=>x!==uid);return {ok:true,selected:false,count:state.draftSelection.length};}
  if(state.draftSelection.length>=STARTER_KEEP)return {ok:false,reason:'keep-limit'};
  state.draftSelection.push(uid);return {ok:true,selected:true,count:state.draftSelection.length};
}
export function revealStarterDraft(state){if(state.phase!=='draft')return {ok:false,reason:'wrong-phase'};state.draftRevealed=true;return {ok:true,player:state.starterDraftPlayer};}
export function confirmStarterDraft(state){
  if(state.phase!=='draft'||!state.draftRevealed)return {ok:false,reason:'draft-hidden'};
  const pid=currentDraftPlayer(state),player=state.players[pid],hand=state.starterDraftHands?.[pid]||[],selected=state.draftSelection||[];
  if(selected.length!==STARTER_KEEP)return {ok:false,reason:'keep-count',required:STARTER_KEEP};
  const kept=hand.filter(card=>selected.includes(card.uid));
  if(kept.length!==STARTER_KEEP)return {ok:false,reason:'invalid-selection'};
  if(player.portfolio.length+kept.length>HAND_LIMIT)return {ok:false,reason:'hand-limit'};
  const discarded=hand.filter(card=>!selected.includes(card.uid));
  player.portfolio.push(...kept.map(card=>card.id));
  state.starterDiscards=state.starterDiscards||[];state.starterDiscards.push(...discarded);state.starterDraftHands[pid]=[];
  logEvent(state,`${player.name} завершает стартовый драфт: оставляет ${STARTER_KEEP} проекта, сбрасывает ${discarded.length}.`,'good');
  state.draftSelection=[];state.draftRevealed=false;
  if(pid>=state.players.length-1){state.phase='declare';state.starterDraftPlayer=null;state.declarationIndex=0;logEvent(state,'Стартовый драфт завершён. Начинается City Hall Session.','accent');return {ok:true,complete:true,nextPlayer:null};}
  state.starterDraftPlayer=pid+1;return {ok:true,complete:false,nextPlayer:state.starterDraftPlayer};
}

export function createInitialState({rng=Math.random}={}){
  const pool=createProjectCardPool({rng});
  const market=pool.splice(0,5).map(emptyMarketCard);
  const starterDraftHands=[
    pool.splice(0,STARTER_DRAFT_SIZE),
    pool.splice(0,STARTER_DRAFT_SIZE),
    pool.splice(0,STARTER_DRAFT_SIZE)
  ];
  // Keep Phase I project market/draft seed stable for existing QA scenarios.
  const newsDeck=shuffle(NEWS_CARDS.map(c=>c.id),rng);
  const newsCurrentIds=[newsDeck.shift()];
  return {
    version:'0.43a',
    round:1,
    newsDeck,
    newsCurrentIds,
    marketExtendedForSixYears:true,
    newsArchive:[],
    newsEmergency:{},
    newsLastResolvedRound:0,
    firstPlayer:0,
    phase:'draft',
    view:'hall',
    declarationIndex:0,
    players:PLAYER_NAMES.map((name,id)=>({id,name,key:PLAYER_KEYS[id],capital:14,influence:2,prestige:0,workers:createWorkers(id),workersLeft:WORKERS_PER_PLAYER,portfolio:[],loans:[],bureauContracts:0})),
    market,
    deck:pool,
    expired:[],
    starterDraftHands,
    starterDiscards:[],
    starterDraftPlayer:0,
    draftSelection:[],
    draftRevealed:false,
    bidQueue:[],
    bidCursor:0,
    selectedMarketUid:market[0]?.uid||null,
    selectedProjectId:market[0]?.id||null,
    selectedDistrictId:'civic',
    pendingConstruction:null,
    constructions:[],
    nextConstructionId:1,
    nextLoanId:1,
    developmentPlayer:null,
    developmentComplete:false,
    activationMainActionUsed:false,
    activeWorkerId:null,
    pendingWorkerAction:null,
    procurementRemaining:0,
    procurementSource:null,
    actionSpaceOccupancy:{},
    bankOwnerRewarded:{},
    bureauOwnerRewarded:{},
    districts:Object.fromEntries(DISTRICTS.map(d=>[d.id,{landValue:d.landValue,sites:d.sites,roadAccess:d.buildable!==false}])),
    logisticsSupply:generateLogisticsSupply({rng}),
    freightYardInventories:[[],[],[]],
    haulersUsed:[],
    log:[{msg:'Началась тестовая партия v0.43A Foundation. Western Addition получил нейтральный Грузовой двор: 2 личных места каждому, новое занятие секции $2. Финальная доставка может завершить проект сверх staging 3.','cls':'accent'}],
    finished:false
  };
}

export function logEvent(state,msg,cls=''){state.log.push({msg,cls});}

export function claimProject(state,slot){
  if(state.phase!=='declare') return {ok:false,reason:'wrong-phase'};
  const pid=currentDeclarer(state); if(pid==null) return {ok:false,reason:'no-declarer'};
  const m=state.market[slot]; if(!m) return {ok:false,reason:'empty-slot'};
  if(state.market.some(x=>x&&x.claims.some(c=>c.player===pid))) return {ok:false,reason:'already-declared'};
  if((state.players[pid].portfolio||[]).length>=HAND_LIMIT)return {ok:false,reason:'hand-limit'};
  const price=openingPrice(m);
  if(state.players[pid].capital<price) return {ok:false,reason:'capital'};
  m.claims.push({player:pid,order:state.declarationIndex});
  logEvent(state,`${state.players[pid].name} заявил проект «${projectById(m.id).name}» (opening $${price}).`);
  state.declarationIndex++;
  state.selectedMarketUid=m.uid;
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
  state.developmentPlayer=state.firstPlayer;
  state.developmentComplete=false;
  state.activationMainActionUsed=false;
  state.activeWorkerId=null;
  state.pendingWorkerAction=null;
  state.actionSpaceOccupancy={};
  state.bankOwnerRewarded={};
  state.bureauOwnerRewarded={};
  logEvent(state,`Тендерная сессия завершена. Development Phase начинает ${state.players[state.developmentPlayer].name}.`,'accent');
  return {ok:true};
}

function award(state,m,pid,price,reason){
  const pl=state.players[pid], p=projectById(m.id);
  if(pl.capital<price){m.result='Ошибка: недостаточно капитала';return;}
  if((pl.portfolio||[]).length>=HAND_LIMIT){m.result='Ошибка: рука заполнена';return;}
  pl.capital-=price;
  pl.portfolio.push(m.id);
  m.sold=true;
  m.result={player:pid,price,reason};
  logEvent(state,`${pl.name} получает «${p.name}» за $${price} (${reason}). Рука: ${pl.portfolio.length}/${HAND_LIMIT}.`,'good');
}

export function districtConstructionCount(state,districtId){
  return (state.constructions||[]).filter(c=>c.districtId===districtId).length;
}

export function constructionEligibility(state,playerId,projectId,districtId){
  const reasons=[];
  const player=state.players[playerId];
  const project=projectById(projectId);
  const district=districtById(districtId);
  const ds=state.districts?.[districtId] || (district?{landValue:district.landValue,sites:district.sites,roadAccess:district.road}:null);
  const access=districtAccess(state,districtId);
  if(state.phase!=='development') reasons.push('Строительство доступно только после тендеров.');
  if(!player||!project||!district||!ds) reasons.push('Недоступный игрок, проект или район.');
  if(player&&project&&!player.portfolio.includes(projectId)) reasons.push('Проекта нет в доступном портфеле игрока.');
  if(player){
    const worker=activeWorker(state,playerId);
    if(currentDeveloper(state)!==playerId)reasons.push('Сейчас ход другого игрока.');
    else if(state.activationMainActionUsed)reasons.push('Главное действие этой активации уже использовано.');
    else if((player.workersLeft??0)<=0)reasons.push('Нет свободных представителей.');
    else if(!worker)reasons.push('Выберите одного из 3 представителей для этой активации.');
    else if(district&&!workerCanReachDistrict(state,playerId,districtId,worker.id)){
      const here=districtById(worker.districtId)?.name||worker.districtId;
      reasons.push(`Представитель #${worker.number} находится в ${here}: можно действовать только здесь или в соседнем районе.`);
    }
  }
  const used=ds?districtConstructionCount(state,districtId):0;
  if(district?.buildable===false) reasons.push('В этой зоне строительство запрещено.');
  else if(ds&&used>=ds.sites) reasons.push('В районе нет свободных строительных площадок.');
  if(project&&ds&&project.landMin!=null&&ds.landValue<project.landMin) reasons.push(`Требуется Land Value ${project.landMin}+.`);
  if(project&&ds&&project.landMax!=null&&ds.landValue>project.landMax) reasons.push(`Требуется Land Value ≤${project.landMax}.`);

  if(project?.accessAll){
    for(const need of project.accessAll){
      if(!access[need]){
        if(need==='road')reasons.push('Нет обычного уличного доступа.');
        else if(need==='fire')reasons.push('Нет Fire Protection: нужна завершённая Fire House в этом или соседнем районе.');
        else if(need==='clinic')reasons.push('Нет Clinic access: нужна завершённая Clinic в этом или соседнем районе.');
        else reasons.push(`Нет требуемого доступа: ${need}.`);
      }
    }
  }
  if(project?.accessAny?.length&&!project.accessAny.some(need=>access[need])){
    const names=project.accessAny.map(x=>x==='road'?'улица':x==='rail'?'Rail':x==='port'?'Port':x).join(' или ');
    reasons.push(`Требуется ${names} access.`);
  }
  const bureauDiscount=player&&ds&&(player.bureauContracts||0)>0&&ds.landValue>0?Math.min(BUREAU_LAND_DISCOUNT,ds.landValue):0;
  const landCost=ds?Math.max(0,ds.landValue-bureauDiscount):0;
  if(player&&ds&&player.capital<landCost) reasons.push(`Не хватает капитала на землю ($${landCost}).`);
  return {
    ok:reasons.length===0,
    reasons,
    cost:landCost,
    baseCost:ds?.landValue??0,
    bureauDiscount,
    landValue:ds?.landValue??0,
    access,
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
  const consumed=consumeMainAction(state,playerId,districtId);
  if(!consumed.ok)return consumed;
  const construction={
    id:`C${state.nextConstructionId||1}`,
    playerId,projectId,districtId,
    startedRound:state.round,
    status:'under-construction',
    materialsDelivered:[],
    warehouseInventory:[],
    completedRound:null
  };
  state.nextConstructionId=(state.nextConstructionId||1)+1;
  player.portfolio.splice(idx,1);
  player.capital-=check.cost;
  if(check.bureauDiscount>0)player.bureauContracts=Math.max(0,(player.bureauContracts||0)-1);
  state.constructions=state.constructions||[];
  state.constructions.push(construction);
  state.pendingConstruction=null;
  state.selectedDistrictId=districtId;
  const discountText=check.bureauDiscount>0?` (Construction Contract −$${check.bureauDiscount})`:'';
  logEvent(state,`${player.name} начал строительство «${projectById(projectId).name}» в ${districtById(districtId).name}: земля $${check.cost}${discountText}.${workerMovementText(consumed)}`,'good');
  return {ok:true,construction,cost:check.cost,bureauDiscount:check.bureauDiscount,worker:consumed.worker};
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

export function completedWarehouses(state,playerId,districtId=null){
  return (state.constructions||[]).filter(c=>
    c.playerId===playerId&&c.projectId==='warehouse'&&c.status==='complete'
    &&(districtId==null||c.districtId===districtId)
  );
}

export function warehouseInventory(construction){
  if(!construction||construction.projectId!=='warehouse'||construction.status!=='complete')return [];
  if(!Array.isArray(construction.warehouseInventory))construction.warehouseInventory=[];
  return construction.warehouseInventory;
}

export function freightYardInventory(state,playerId){
  if(!Array.isArray(state.freightYardInventories))state.freightYardInventories=[[],[],[]];
  while(state.freightYardInventories.length<PLAYER_NAMES.length)state.freightYardInventories.push([]);
  if(!Array.isArray(state.freightYardInventories[playerId]))state.freightYardInventories[playerId]=[];
  return state.freightYardInventories[playerId];
}

export function warehouseCapacityBonus(){return 0;}

export function constructionCapacity(){return CONSTRUCTION_STAGING_CAPACITY;}

export function constructionProgress(state,constructionId){
  const construction=(state.constructions||[]).find(c=>c.id===constructionId);
  if(!construction)return null;
  const project=projectById(construction.projectId);
  const required=project?.materials?.length||0;
  const delivered=(construction.materialsDelivered||[]).length;
  const warehouses=completedWarehouses(state,construction.playerId,construction.districtId);
  const warehouseMaterials=warehouses.flatMap(warehouseInventory);
  return {
    construction,project,required,delivered,
    capacity:CONSTRUCTION_STAGING_CAPACITY,
    complete:construction.status==='complete',
    remaining:Math.max(0,required-delivered),
    warehouseCount:warehouses.length,
    warehouseStored:warehouseMaterials.length,
    warehouseCapacity:warehouses.length*WAREHOUSE_STORAGE_CAPACITY
  };
}

function materialNameRu(type){return {Lumber:'Дерево',Masonry:'Камень',Steel:'Сталь'}[type]||type;}

function materialCounts(items=[]){
  return items.reduce((acc,type)=>{acc[type]=(acc[type]||0)+1;return acc;},{});
}

function missingProjectMaterials(project,staged=[]){
  const required=materialCounts(project?.materials||[]);
  const have=materialCounts(staged);
  const missing={};
  Object.keys(required).forEach(type=>missing[type]=Math.max(0,required[type]-(have[type]||0)));
  return missing;
}

export function canCompleteConstruction(state,constructionId){
  const construction=(state.constructions||[]).find(c=>c.id===constructionId);
  if(!construction)return {ok:false,reason:'not-found'};
  if(construction.status!=='under-construction')return {ok:false,reason:'complete'};
  const project=projectById(construction.projectId);
  if(!project)return {ok:false,reason:'project'};
  const missing=missingProjectMaterials(project,construction.materialsDelivered||[]);
  const missingTotal=Object.values(missing).reduce((a,b)=>a+b,0);
  if(missingTotal===0)return {ok:true,missing:{},warehouseUse:0};
  const warehouses=completedWarehouses(state,construction.playerId,construction.districtId);
  if(!warehouses.length)return {ok:false,reason:'warehouse-required',missing,warehouseUse:missingTotal};
  const available=materialCounts(warehouses.flatMap(warehouseInventory));
  const lacking=Object.entries(missing).filter(([type,count])=>(available[type]||0)<count);
  if(lacking.length)return {ok:false,reason:'warehouse-materials',missing,warehouseUse:missingTotal};
  return {ok:true,missing,warehouseUse:missingTotal};
}

function consumeWarehouseMaterials(state,playerId,districtId,missing){
  const warehouses=completedWarehouses(state,playerId,districtId);
  for(const [type,count] of Object.entries(missing)){
    let left=count;
    for(const wh of warehouses){
      const inv=warehouseInventory(wh);
      while(left>0){
        const idx=inv.indexOf(type);
        if(idx<0)break;
        inv.splice(idx,1);
        left--;
      }
      if(left===0)break;
    }
    if(left>0)return false;
  }
  return true;
}

export function completeConstruction(state,construction){
  if(!construction||construction.status!=='under-construction')return {ok:false};
  const project=projectById(construction.projectId);
  const check=canCompleteConstruction(state,construction.id);
  if(!check.ok)return check;
  if(check.warehouseUse>0&&!consumeWarehouseMaterials(state,construction.playerId,construction.districtId,check.missing)){
    return {ok:false,reason:'warehouse-materials'};
  }
  const riskBefore=districtRisk(state,construction.districtId);
  construction.materialsDelivered=[...(project.materials||[])];
  construction.status='complete';
  construction.completedRound=state.round;
  if(project.id==='warehouse'&&!Array.isArray(construction.warehouseInventory))construction.warehouseInventory=[];
  const player=state.players[construction.playerId];
  const vp=project.prestige||0;
  if(vp){
    player.prestige=(player.prestige||0)+vp;
    logEvent(state,`${player.name} завершил «${project.name}» в ${districtById(construction.districtId).name} и получает +${vp} Prestige VP.`,'good');
  }else{
    logEvent(state,`${player.name} завершил «${project.name}» в ${districtById(construction.districtId).name}.`,'good');
  }

  const roadOpened=false;

  const landChange=LAND_VALUE_COMPLETION_CHANGE[construction.projectId]||0;
  if(landChange&&state.districts?.[construction.districtId]){
    const before=state.districts[construction.districtId].landValue;
    const after=Math.max(0,Math.min(6,before+landChange));
    state.districts[construction.districtId].landValue=after;
    if(after!==before){
      const verb=landChange>0?'повышает':'снижает';
      logEvent(state,`${project.name} ${verb} Land Value района ${districtById(construction.districtId).name}: $${before} → $${after}.`,'accent');
    }
  }
  const riskAfter=districtRisk(state,construction.districtId);
  if(riskBefore&&riskAfter&&(riskBefore.earthquake.raw!==riskAfter.earthquake.raw||riskBefore.fire.raw!==riskAfter.fire.raw)){
    logEvent(state,`Риск ${districtById(construction.districtId).name}: У ${riskBefore.earthquake.raw}→${riskAfter.earthquake.raw} · П ${riskBefore.fire.raw}→${riskAfter.fire.raw}.`,'accent');
  }
  return {ok:true,prestige:vp,landChange,roadOpened,warehouseUse:check.warehouseUse||0};
}

export function completeConstructionFromStorage(state,constructionId){
  const construction=(state.constructions||[]).find(c=>c.id===constructionId);
  if(!construction)return {ok:false,reason:'not-found'};
  if(!canUseFreeAction(state,construction.playerId))return {ok:false,reason:'not-active-player'};
  return completeConstruction(state,construction);
}

// Legacy direct-buy hooks are intentionally disabled in v0.28.
export function canRentOverflow(){return {ok:false,reason:'removed'};}
export function rentOverflowSlot(){return {ok:false,reason:'removed'};}
export function canDeliverMaterial(){return {ok:false,reason:'delivery-system'};}
export function deliverMaterial(){return {ok:false,reason:'delivery-system'};}

export function deliveryTraversableDistrict(districtId){
  const d=districtById(districtId);
  return !!d&&d.buildable!==false&&d.passable!==false;
}

export function deliveryNeighbors(districtId){
  if(!deliveryTraversableDistrict(districtId))return [];
  return districtNeighbors(districtId).filter(deliveryTraversableDistrict);
}

export function deliverySourceInfo(state,playerId,source){
  if(!source)return null;
  if(source.kind==='node'){
    const node=LOGISTICS_NODES.find(n=>n.id===source.id);
    if(!node)return null;
    return {kind:'node',id:node.id,name:node.name,districtId:node.districtId,inventory:state.logisticsSupply?.[node.id]||[]};
  }
  if(source.kind==='warehouse'){
    const wh=(state.constructions||[]).find(c=>c.id===source.id&&c.playerId===playerId&&c.projectId==='warehouse'&&c.status==='complete');
    if(!wh)return null;
    return {kind:'warehouse',id:wh.id,name:`Warehouse · ${districtById(wh.districtId)?.name||wh.districtId}`,districtId:wh.districtId,inventory:warehouseInventory(wh)};
  }
  if(source.kind==='freight-yard'&&source.id===FREIGHT_YARD.id){
    const inventory=freightYardInventory(state,playerId);
    if(!inventory.length)return null;
    return {kind:'freight-yard',id:FREIGHT_YARD.id,name:FREIGHT_YARD.name,districtId:FREIGHT_YARD.districtId,inventory};
  }
  return null;
}

export function availableDeliveryHaulers(state){
  const used=new Set(state.haulersUsed||[]);
  return DELIVERY_HAULERS.map(h=>({...h,available:!h.limited||!used.has(h.id)}));
}

function hasMaterials(inventory,cargo){
  const have=materialCounts(inventory),need=materialCounts(cargo);
  return Object.entries(need).every(([type,count])=>(have[type]||0)>=count);
}

function removeMaterials(inventory,cargo){
  if(!hasMaterials(inventory,cargo))return false;
  for(const type of cargo){
    const idx=inventory.indexOf(type);
    inventory.splice(idx,1);
  }
  return true;
}

function multisetEquals(a,b){
  const ac=materialCounts(a),bc=materialCounts(b);
  const keys=new Set([...Object.keys(ac),...Object.keys(bc)]);
  return [...keys].every(k=>(ac[k]||0)===(bc[k]||0));
}

export function deliveryMaterialCost(state,source,cargo){
  if(source?.kind!=='node')return {gross:0,discount:0,cost:0,procurementUsed:0};
  const prices=(cargo||[]).map(type=>RESOURCE_PRICES[type]??0);
  const gross=prices.reduce((a,b)=>a+b,0);
  const procurementUsed=Math.min(state.procurementRemaining||0,prices.length);
  const discount=[...prices].sort((a,b)=>b-a).slice(0,procurementUsed).reduce((a,b)=>a+b,0);
  return {gross,discount,cost:gross-discount,procurementUsed};
}

export function freightYardRentCost(state,plan){
  const deposits=(plan?.drops||[]).filter(d=>d?.kind==='freight-yard'&&Array.isArray(d.materials)&&d.materials.length);
  if(!deposits.length)return 0;
  return freightYardInventory(state,plan.playerId).length===0?FREIGHT_YARD.rentCost:0;
}

export function deliveryPlanCost(state,plan){
  const hauler=DELIVERY_HAULERS.find(h=>h.id===plan?.haulerId);
  if(!hauler)return null;
  const route=plan.route||[];
  const material=deliveryMaterialCost(state,plan.source,plan.cargo||[]);
  const routeCost=Math.max(0,route.length-1)*DELIVERY_EDGE_COST;
  const yardRentCost=freightYardRentCost(state,plan);
  return {
    materialGross:material.gross,
    procurementDiscount:material.discount,
    procurementUsed:material.procurementUsed,
    materialCost:material.cost,
    haulerCost:hauler.baseCost,
    routeCost,
    yardRentCost,
    total:material.cost+hauler.baseCost+routeCost+yardRentCost
  };
}

function validateRoute(route,sourceDistrictId){
  if(!Array.isArray(route)||!route.length||route[0]!==sourceDistrictId)return false;
  if(!route.every(deliveryTraversableDistrict))return false;
  for(let i=1;i<route.length;i++){
    if(!deliveryNeighbors(route[i-1]).includes(route[i]))return false;
  }
  return true;
}

function targetDistrictId(state,target){
  if(target.kind==='construction'){
    return (state.constructions||[]).find(c=>c.id===target.id)?.districtId||null;
  }
  if(target.kind==='warehouse'){
    return (state.constructions||[]).find(c=>c.id===target.id)?.districtId||null;
  }
  if(target.kind==='freight-yard'&&target.id===FREIGHT_YARD.id)return FREIGHT_YARD.districtId;
  return null;
}

export function validateDeliveryPlan(state,plan){
  if(!plan||!Number.isInteger(plan.playerId))return {ok:false,reason:'plan'};
  const player=state.players[plan.playerId];
  if(!player)return {ok:false,reason:'player'};
  if(!canUseFreeAction(state,plan.playerId))return {ok:false,reason:'not-active-player'};
  const source=deliverySourceInfo(state,plan.playerId,plan.source);
  if(!source)return {ok:false,reason:'source'};
  const cargo=Array.isArray(plan.cargo)?plan.cargo:[];
  if(!cargo.length)return {ok:false,reason:'cargo'};
  if(!hasMaterials(source.inventory,cargo))return {ok:false,reason:'source-stock'};

  const hauler=DELIVERY_HAULERS.find(h=>h.id===plan.haulerId);
  if(!hauler)return {ok:false,reason:'hauler'};
  if(hauler.limited&&(state.haulersUsed||[]).includes(hauler.id))return {ok:false,reason:'hauler-used'};
  if(cargo.length>hauler.capacity)return {ok:false,reason:'capacity'};

  const route=Array.isArray(plan.route)?plan.route:[];
  if(!validateRoute(route,source.districtId))return {ok:false,reason:'route'};
  const routeSet=new Set(route);
  const drops=Array.isArray(plan.drops)?plan.drops:[];
  const assigned=drops.flatMap(d=>d.materials||[]);
  if(!multisetEquals(cargo,assigned))return {ok:false,reason:'unassigned'};

  const constructionDraft=new Map();
  const warehouseDraft=new Map();
  let freightYardDraft=[...freightYardInventory(state,plan.playerId)];
  for(const drop of drops){
    if(!drop||!Array.isArray(drop.materials)||!drop.materials.length)continue;
    const districtId=targetDistrictId(state,drop);
    if(!districtId||!routeSet.has(districtId))return {ok:false,reason:'target-route'};
    if(drop.kind==='construction'){
      const con=(state.constructions||[]).find(c=>c.id===drop.id);
      if(!con||con.playerId!==plan.playerId||con.status!=='under-construction')return {ok:false,reason:'target'};
      const staged=[...(constructionDraft.get(con.id)||con.materialsDelivered||[]),...drop.materials];
      const projectMaterials=projectById(con.projectId)?.materials||[];
      const required=materialCounts(projectMaterials);
      const counts=materialCounts(staged);
      if(Object.entries(counts).some(([type,count])=>count>(required[type]||0)))return {ok:false,reason:'target-material'};
      const completesProject=multisetEquals(staged,projectMaterials);
      if(staged.length>CONSTRUCTION_STAGING_CAPACITY&&!completesProject)return {ok:false,reason:'target-capacity'};
      constructionDraft.set(con.id,staged);
    }else if(drop.kind==='warehouse'){
      const wh=(state.constructions||[]).find(c=>c.id===drop.id);
      if(!wh||wh.playerId!==plan.playerId||wh.projectId!=='warehouse'||wh.status!=='complete')return {ok:false,reason:'target'};
      if(plan.source.kind==='warehouse'&&plan.source.id===wh.id)return {ok:false,reason:'same-warehouse'};
      const stored=[...(warehouseDraft.get(wh.id)||warehouseInventory(wh)),...drop.materials];
      if(stored.length>WAREHOUSE_STORAGE_CAPACITY)return {ok:false,reason:'target-capacity'};
      warehouseDraft.set(wh.id,stored);
    }else if(drop.kind==='freight-yard'){
      if(drop.id!==FREIGHT_YARD.id)return {ok:false,reason:'target'};
      if(plan.source.kind==='freight-yard')return {ok:false,reason:'same-freight-yard'};
      freightYardDraft=[...freightYardDraft,...drop.materials];
      if(freightYardDraft.length>FREIGHT_YARD.capacityPerPlayer)return {ok:false,reason:'target-capacity'};
    }else return {ok:false,reason:'target'};
  }

  const cost=deliveryPlanCost(state,plan);
  if(!cost)return {ok:false,reason:'cost'};
  if(player.capital<cost.total)return {ok:false,reason:'capital',cost};
  return {ok:true,cost,source,hauler};
}

export function executeDelivery(state,plan){
  const check=validateDeliveryPlan(state,plan);
  if(!check.ok)return check;
  const {source,hauler,cost}=check;
  const sourceInventory=source.kind==='node'
    ?state.logisticsSupply[source.id]
    :source.kind==='warehouse'
      ?warehouseInventory((state.constructions||[]).find(c=>c.id===source.id))
      :freightYardInventory(state,plan.playerId);
  if(!removeMaterials(sourceInventory,plan.cargo))return {ok:false,reason:'source-stock'};

  const player=state.players[plan.playerId];
  player.capital-=cost.total;
  if(hauler.limited){
    state.haulersUsed=state.haulersUsed||[];
    state.haulersUsed.push(hauler.id);
  }
  if(source.kind==='node'&&cost.procurementUsed){
    state.procurementRemaining=Math.max(0,(state.procurementRemaining||0)-cost.procurementUsed);
  }

  const directConstructionIds=[];
  for(const drop of plan.drops||[]){
    if(drop.kind==='construction'){
      const con=state.constructions.find(c=>c.id===drop.id);
      con.materialsDelivered=con.materialsDelivered||[];
      con.materialsDelivered.push(...drop.materials);
      if(!directConstructionIds.includes(con.id))directConstructionIds.push(con.id);
    }else if(drop.kind==='warehouse'){
      const wh=state.constructions.find(c=>c.id===drop.id);
      warehouseInventory(wh).push(...drop.materials);
    }else if(drop.kind==='freight-yard'){
      freightYardInventory(state,plan.playerId).push(...drop.materials);
    }
  }

  const routeText=(plan.route||[]).map(id=>districtById(id)?.name||id).join(' → ');
  const dropText=(plan.drops||[]).filter(d=>Array.isArray(d.materials)&&d.materials.length).map(drop=>{
    const con=drop.kind==='freight-yard'?null:state.constructions.find(c=>c.id===drop.id);
    const districtName=drop.kind==='freight-yard'
      ?districtById(FREIGHT_YARD.districtId)?.name
      :(districtById(con?.districtId)?.name||con?.districtId||'?');
    const targetName=drop.kind==='freight-yard'
      ?`${FREIGHT_YARD.name} (${districtName})`
      :drop.kind==='warehouse'
        ?`Warehouse (${districtName})`
        :`«${projectById(con?.projectId)?.name||con?.projectId||'стройка'}» (${districtName})`;
    const counts=materialCounts(drop.materials);
    const materials=Object.entries(counts).map(([type,count])=>`${materialNameRu(type)} ×${count}`).join(', ');
    return `${targetName}: ${materials}`;
  }).join('; ');
  const rentText=cost.yardRentCost?` + аренда ${cost.yardRentCost}`:'';
  logEvent(state,`${player.name} выполняет Delivery: ${source.name}; ${hauler.name} ${plan.cargo.length}/${hauler.capacity}; маршрут ${routeText}; разгрузка: ${dropText||'—'}; материалы ${cost.materialCost} + перевозчик ${cost.haulerCost} + дорога ${cost.routeCost}${rentText} = ${cost.total}.`,'accent');

  const completed=[];
  for(const id of directConstructionIds){
    const con=state.constructions.find(c=>c.id===id);
    const result=completeConstruction(state,con);
    if(result.ok)completed.push(id);
  }

  return {ok:true,cost,completed,hauler,source};
}

export function buildingIncome(state,playerId){
  return (state.constructions||[]).filter(c=>c.playerId===playerId&&c.status==='complete')
    .reduce((sum,c)=>sum+(projectById(c.projectId)?.income||0),0);
}

export function grossRoundIncome(state,playerId){
  return BASE_ROUND_INCOME+buildingIncome(state,playerId);
}

export function roundIncome(state,playerId){
  return Math.max(0,grossRoundIncome(state,playerId)-loanInterest(state,playerId));
}

export function raiseCapital(state,playerId,targetDistrictId=null){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const worker=activeWorker(state,playerId);
  const target=targetDistrictId||worker?.districtId;
  if(!target||!workerCanReachDistrict(state,playerId,target,worker?.id))return {ok:false,reason:'worker-range',districtId:target};
  const player=state.players[playerId];
  const consumed=consumeMainAction(state,playerId,target);
  if(!consumed.ok)return consumed;
  player.capital+=RAISE_CAPITAL_AMOUNT;
  logEvent(state,`${player.name} использует Raise Capital: +${RAISE_CAPITAL_AMOUNT}.${workerMovementText(consumed)}`,'good');
  return {ok:true,amount:RAISE_CAPITAL_AMOUNT,worker:consumed.worker,from:consumed.from,to:consumed.to};
}

export function takeBankLoan(state,playerId,bankConstructionId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const bank=(state.constructions||[]).find(c=>c.id===bankConstructionId&&c.projectId==='bank'&&c.status==='complete');
  if(!bank)return {ok:false,reason:'no-bank'};
  if(!workerCanReachDistrict(state,playerId,bank.districtId))return {ok:false,reason:'worker-range',districtId:bank.districtId};
  if(actionSpaceOccupant(state,bankConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  player.loans=player.loans||[];
  if(player.loans.length>=MAX_ACTIVE_LOANS)return {ok:false,reason:'max-loans'};
  const received=player.loans.length===0?6:5;
  const consumed=consumeMainAction(state,playerId,bank.districtId);
  if(!consumed.ok)return consumed;
  const loan={id:`L${state.nextLoanId||1}`,principal:LOAN_PRINCIPAL,received,takenRound:state.round,interestPaid:false};
  state.nextLoanId=(state.nextLoanId||1)+1;
  player.loans.push(loan);
  player.capital+=received;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[bankConstructionId]=playerId;
  const owner=state.players[bank.playerId];
  if(bank.playerId!==playerId&&!state.bankOwnerRewarded?.[bank.playerId]){
    state.bankOwnerRewarded=state.bankOwnerRewarded||{};
    state.bankOwnerRewarded[bank.playerId]=true;
    owner.influence+=1;
    logEvent(state,`${owner.name} получает +1 Influence: другой игрок использовал его Bank.`,'good');
  }
  logEvent(state,`${player.name} берёт Bank Loan: +$${received}, долг $${LOAN_PRINCIPAL}, будущий Income −$1.${workerMovementText(consumed)}`,'accent');
  return {ok:true,received,loan,worker:consumed.worker};
}

export function repayLoan(state,playerId,loanId=null){
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if(!canUseFreeAction(state,playerId))return {ok:false,reason:'not-active-player'};
  const player=state.players[playerId];
  if(!player)return {ok:false,reason:'player'};
  player.loans=player.loans||[];
  const loan=loanId?player.loans.find(x=>x.id===loanId):player.loans.find(x=>x.interestPaid);
  if(!loan)return {ok:false,reason:'not-seasoned'};
  if(!loan.interestPaid)return {ok:false,reason:'not-seasoned'};
  if(player.capital<loan.principal)return {ok:false,reason:'capital'};
  player.capital-=loan.principal;
  player.loans=player.loans.filter(x=>x.id!==loan.id);
  logEvent(state,`${player.name} погашает кредит $${loan.principal}.`,'good');
  return {ok:true,paid:loan.principal};
}

export function takeBureauContract(state,playerId,bureauConstructionId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const bureau=(state.constructions||[]).find(c=>c.id===bureauConstructionId&&c.projectId==='bureau'&&c.status==='complete');
  if(!bureau)return {ok:false,reason:'no-bureau'};
  if(!workerCanReachDistrict(state,playerId,bureau.districtId))return {ok:false,reason:'worker-range',districtId:bureau.districtId};
  if(actionSpaceOccupant(state,bureauConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  if((player.bureauContracts||0)>=1)return {ok:false,reason:'has-contract'};
  const consumed=consumeMainAction(state,playerId,bureau.districtId);
  if(!consumed.ok)return consumed;
  player.bureauContracts=1;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[bureauConstructionId]=playerId;
  const owner=state.players[bureau.playerId];
  if(bureau.playerId!==playerId&&!state.bureauOwnerRewarded?.[bureau.playerId]){
    state.bureauOwnerRewarded=state.bureauOwnerRewarded||{};
    state.bureauOwnerRewarded[bureau.playerId]=true;
    owner.capital+=1;
    logEvent(state,`${owner.name} получает $1: другой игрок использовал его Construction Bureau.`,'good');
  }
  logEvent(state,`${player.name} получает Construction Contract: следующая платная земля дешевле до $2.${workerMovementText(consumed)}`,'accent');
  return {ok:true,discount:BUREAU_LAND_DISCOUNT,worker:consumed.worker};
}

export function useShoppingProcurement(state,playerId,shopsConstructionId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const shops=(state.constructions||[]).find(c=>c.id===shopsConstructionId&&c.projectId==='shops'&&c.status==='complete');
  if(!shops)return {ok:false,reason:'no-shops'};
  if(!workerCanReachDistrict(state,playerId,shops.districtId))return {ok:false,reason:'worker-range',districtId:shops.districtId};
  if(actionSpaceOccupant(state,shopsConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  if(player.capital<1)return {ok:false,reason:'capital'};
  const hasConstruction=(state.constructions||[]).some(c=>c.playerId===playerId&&c.status==='under-construction');
  if(!hasConstruction)return {ok:false,reason:'no-construction'};
  const consumed=consumeMainAction(state,playerId,shops.districtId);
  if(!consumed.ok)return consumed;
  player.capital-=1;
  const owner=state.players[shops.playerId];
  if(shops.playerId!==playerId)owner.capital+=1;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[shopsConstructionId]=playerId;
  state.procurementRemaining=2;
  state.procurementSource=shopsConstructionId;
  if(shops.playerId!==playerId){
    logEvent(state,`${player.name} платит $1 Торговому ряду игрока ${owner.name} и получает Procurement: до 2 материалов бесплатно в следующих Delivery этой активации.${workerMovementText(consumed)}`,'accent');
  }else{
    logEvent(state,`${player.name} тратит $1 на Procurement через собственный Торговый ряд: до 2 материалов бесплатно в следующих Delivery этой активации.${workerMovementText(consumed)}`,'accent');
  }
  return {ok:true,materials:2,cost:1,worker:consumed.worker};
}

export function useSocialClub(state,playerId,clubConstructionId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const club=(state.constructions||[]).find(c=>c.id===clubConstructionId&&c.projectId==='club'&&c.status==='complete');
  if(!club)return {ok:false,reason:'no-club'};
  if(!workerCanReachDistrict(state,playerId,club.districtId))return {ok:false,reason:'worker-range',districtId:club.districtId};
  if(actionSpaceOccupant(state,clubConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  if(player.capital<1)return {ok:false,reason:'capital'};
  const consumed=consumeMainAction(state,playerId,club.districtId);
  if(!consumed.ok)return consumed;
  player.capital-=1;
  const owner=state.players[club.playerId];
  if(club.playerId!==playerId)owner.capital+=1;
  player.influence+=1;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[clubConstructionId]=playerId;
  if(club.playerId!==playerId){
    logEvent(state,`${player.name} ужинает и заводит связи в клубе игрока ${owner.name}: −$1, +1 Influence; $1 получает владелец заведения.${workerMovementText(consumed)}`,'accent');
  }else{
    logEvent(state,`${player.name} тратит $1 на ужин и приём состоятельных горожан в своём клубе: +1 Influence.${workerMovementText(consumed)}`,'accent');
  }
  return {ok:true,cost:1,influence:1,worker:consumed.worker};
}

export function setLandValue(state,districtId,value){
  const district=districtById(districtId);
  if(!district||!state.districts?.[districtId])return {ok:false};
  const v=Math.max(0,Math.min(6,Math.floor(Number(value))));
  if(!Number.isFinite(v))return {ok:false};
  state.districts[districtId].landValue=v;
  return {ok:true,value:v};
}

export function cleanupMarket(state,{rng=Math.random}={}){
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if(!state.developmentComplete)return {ok:false,reason:'development-not-complete'};
  // Every newspaper is announced at the beginning of its year and
  // settled only after every representative has taken their actions.
  // Calling cleanup while Development is unfinished has no side effects.
  ensureNewspaper(state,{rng});
  resolveNewspaper(state);
  const remaining=state.market.filter(m=>m&&!m.sold);
  const old=remaining.filter(m=>m.age===1);
  old.forEach(m=>{state.expired.push({uid:m.uid,id:m.id});logEvent(state,`«${projectById(m.id).name}» сгорел: последний шанс истёк.`,'bad');});
  const fresh=remaining.filter(m=>m.age===0);
  const survivors=fresh.slice(0,2);
  fresh.slice(2).forEach(m=>{state.expired.push({uid:m.uid,id:m.id});logEvent(state,`«${projectById(m.id).name}» сброшен с правого края рынка.`,'bad');});
  survivors.forEach(m=>{m.age=1;m.discount=1;m.claims=[];m.bids={};m.result=null;m.sold=false;});

  if(state.round>=MAX_ROUNDS){
    state.finished=true;state.phase='finished';
    state.market=[...survivors];
    state.procurementRemaining=0;state.procurementSource=null;
    const score=state.players.map(p=>`${p.name}: ${p.prestige||0} VP`).join(' · ');
    logEvent(state,`Prestige после Phase I — ${score}.`,'accent');
    logEvent(state,'Phase I завершена после '+MAX_ROUNDS+' лет (1900–1905).','accent');
    return {ok:true,finished:true};
  }

  state.players.forEach(p=>{
    const gross=grossRoundIncome(state,p.id);
    const interest=loanInterest(state,p.id);
    const amount=Math.max(0,gross-interest);
    p.capital+=amount;
    (p.loans||[]).forEach(loan=>loan.interestPaid=true);
    const interestText=interest?` − $${interest} проценты`:'';
    logEvent(state,`${p.name} получает доход $${amount} ($${BASE_ROUND_INCOME} базовый + $${buildingIncome(state,p.id)} здания${interestText}).`,'good');
  });

  const needed=5-survivors.length;
  const incoming=[];
  while(incoming.length<needed&&state.deck.length)incoming.push(emptyMarketCard(state.deck.shift()));
  const blanks=Array(Math.max(0,5-incoming.length-survivors.length)).fill(null);
  state.market=[...incoming,...blanks,...survivors];
  state.round++;
  state.newsCurrentIds=[state.newsDeck.shift()].filter(Boolean);
  state.newsEmergency={};
  const forthcoming=newsCard(state.newsCurrentIds[0]);
  if(forthcoming)logEvent(state,'THE SAN FRANCISCO CALL · '+newsYear(state.round)+': '+forthcoming.title+'. Событие произойдёт в конце года.','accent');
  refreshLogisticsSupply(state,{rng});
  state.haulersUsed=[];
  state.firstPlayer=(state.firstPlayer+1)%3;
  state.players.forEach(p=>{p.workers=p.workers?.length?p.workers:createWorkers(p.id);p.workers.forEach(w=>w.used=false);p.workersLeft=p.workers.length;});
  state.developmentPlayer=null;state.developmentComplete=false;state.activationMainActionUsed=false;state.activeWorkerId=null;state.pendingWorkerAction=null;
  state.procurementRemaining=0;state.procurementSource=null;
  state.actionSpaceOccupancy={};
  state.bankOwnerRewarded={};state.bureauOwnerRewarded={};
  state.phase='declare';state.view='hall';state.declarationIndex=0;state.bidQueue=[];state.bidCursor=0;
  state.market.forEach(m=>{if(m){m.claims=[];m.bids={};m.result=null;m.sold=false;}});
  const first=state.market.find(Boolean);
  state.selectedMarketUid=first?.uid||null;
  state.selectedProjectId=first?.id||null;
  logEvent(state,`Раунд ${state.round}. Первый игрок: ${state.players[state.firstPlayer].name}. Старые проекты сдвинуты вправо и стоят на $1 дешевле.`,'accent');
  logEvent(state,'Поставки в портах и на станциях полностью обновлены: Lumber 40% · Masonry 35% · Steel 25%.','accent');
  return {ok:true,finished:false};
}

export function tenderSummary(state){
  return state.market.filter(Boolean).map(m=>({
    uid:m.uid,
    id:m.id,
    price:openingPrice(m),
    age:m.age,
    claims:m.claims.map(c=>c.player),
    sold:m.sold,
    result:m.result
  }));
}



// The newspaper is public information: no hidden end-of-year random draws.
// News decks have unique ids per party and preserve their sequence in saves.
// The array-valued active slot allows a later optional 2 articles/year.
export function ensureNewspaper(state,{rng=Math.random}={}){
  if(!Array.isArray(state.newsDeck)||!Array.isArray(state.newsCurrentIds)||!Array.isArray(state.newsArchive)){
    const previous=new Set((state.newsArchive||[]).flatMap(x=>x.ids||[x.cardId]));
    const deck=shuffle(NEWS_CARDS.map(c=>c.id).filter(id=>!previous.has(id)),rng);
    state.newsCurrentIds=[deck.shift()].filter(Boolean);
    state.newsDeck=deck;
    state.newsArchive=state.newsArchive||[];
    state.newsEmergency={};
    state.newsLastResolvedRound=0;
    logEvent(state,'Газета The San Francisco Call добавлена к текущей партии; прогноз до конца года открыт.','accent');
  }
  if(!state.newsEmergency||typeof state.newsEmergency!=='object')state.newsEmergency={};
  if(!Number.isInteger(state.newsLastResolvedRound))state.newsLastResolvedRound=0;
  return state;
}
export function activeNewspaper(state){
  return newsCard(state.newsCurrentIds?.[0])||null;
}
function newspaperTargets(state,card,construction){
  const project=projectById(construction.projectId);
  if(!project||construction.status!=='complete')return false;
  const id=project.id,type=project.type;
  switch(card.target){
    case 'housing':return type==='Жильё';
    case 'commerce':return type==='Коммерция';
    case 'industry-logistics':return type==='Промышленность'||type==='Логистика';
    case 'factory':return id==='factory';
    case 'shops-club':return ['shops','club'].includes(id);
    case 'warehouse-factory':return ['warehouse','factory'].includes(id);
    case 'bank-insurance-hotel':return ['bank','insurance','hotel'].includes(id);
    case 'tenement-speculative':return ['tenement','speculative'].includes(id);
    case 'hotel-club-shops':return ['hotel','club','shops'].includes(id);
    case 'shops-club-hotel':return ['shops','club','hotel'].includes(id);
    case 'port-freight':{
      const district=districtById(construction.districtId);
      return ['warehouse','factory'].includes(id)&&!!(district?.port||district?.rail);
    }
    case 'high-fire':return (districtRisk(state,construction.districtId)?.fire.raw||0)>=2;
    case 'service':return ['firehouse','clinic','police'].includes(id);
    default:return false;
  }
}
function newsServiceSources(state,districtId,kind){
  if(!kind||kind==='emergency')return [];
  // Unlike access requirements for Phase I projects, real fire protection
  // was agreed to apply only to the station's own district.
  if(kind==='firehouse')return completedActionSpaces(state,'firehouse').filter(c=>c.districtId===districtId);
  if(kind==='clinic'||kind==='police')return serviceSources(state,districtId,kind);
  return [];
}
export function newsPreview(state){
  const card=activeNewspaper(state);
  if(!card)return {card:null,entries:[],threatened:[],protected:[],summary:{}};
  const candidates=(state.constructions||[]).filter(c=>newspaperTargets(state,card,c));
  // Multiple properties from one owner in one district count once.
  const groups=new Map();
  for(const c of candidates){
    const key=card.frequency==='oncePerPlayer'||card.target==='service'
      ? String(c.playerId)
      : c.playerId+'|'+c.districtId;
    if(!groups.has(key))groups.set(key,{playerId:c.playerId,districtIds:[],projectIds:[],kind:card.target});
    const g=groups.get(key);
    if(!g.districtIds.includes(c.districtId))g.districtIds.push(c.districtId);
    if(!g.projectIds.includes(c.projectId))g.projectIds.push(c.projectId);
  }
  const entries=[];
  for(const g of groups.values()){
    if(card.target==='service'){
      entries.push({...g,districtId:g.districtIds[0],defended:false,stationOwners:[],temporary:false,delta:card.delta});
      continue;
    }
    // A once-per-player consequence is prevented only if ALL matching
    // completed properties of that owner are defended.
    const coverage=g.districtIds.map(id=>({
      id,sources:newsServiceSources(state,id,card.defense),
      temporary:!!state.newsEmergency?.[id]
    }));
    const exposed=coverage.filter(x=>!x.sources.length&&!x.temporary);
    const prevented=coverage.filter(x=>x.sources.length||x.temporary);
    const protectedGroup=exposed.length===0;
    const stationOwners=[...new Set(prevented.flatMap(x=>x.sources.map(c=>c.playerId)))];
    entries.push({...g,districtId:g.districtIds[0],defended:card.delta<0&&protectedGroup,
      exposedDistrictIds:exposed.map(x=>x.id),preventedDistrictIds:prevented.map(x=>x.id),
      stationOwners,temporary:coverage.some(x=>x.temporary),
      delta:card.delta});
  }
  const threatened=[...new Set(entries.flatMap(e=>e.exposedDistrictIds||[]))];
  const protectedIds=[...new Set(entries.flatMap(e=>e.preventedDistrictIds||[]))];
  return {card,entries,threatened,protected:protectedIds,
    summary:{districts:[...new Set(candidates.map(c=>c.districtId))].length,
      exposed:threatened.length,safe:protectedIds.length}};
}
export function takeNewspaperEmergency(state,playerId,districtId){
  const card=activeNewspaper(state),player=state.players?.[playerId];
  if(!card||card.delta>=0)return {ok:false,reason:'not-negative-event'};
  if(!districtById(districtId)?.buildable)return {ok:false,reason:'district-not-buildable'};
  if(state.newsEmergency?.[districtId])return {ok:false,reason:'already-protected'};
  if(!player||player.capital<1)return {ok:false,reason:'need-$1'};
  const can=canTakeMainAction(state,playerId);
  if(!can)return {ok:false,reason:'select-active-worker'};
  // The ordinary worker's range and main action restrictions also apply.
  const action=consumeMainAction(state,playerId,districtId);
  if(!action.ok)return action;
  player.capital-=1;
  state.newsEmergency[districtId]={playerId,round:state.round,cardId:card.id};
  logEvent(state,player.name+' тратит $1 и действие представителя на экстренные меры в '+districtById(districtId).name+
    ' против «'+card.title+'».','good');
  return {ok:true,action};
}
export function resolveNewspaper(state){
  ensureNewspaper(state);
  if(state.newsLastResolvedRound===state.round)return {ok:false,reason:'already-resolved'};
  const forecast=newsPreview(state);
  const {card,entries}=forecast;
  if(!card)return {ok:false,reason:'no-card'};
  const changes=new Map();
  const write=(pid,key,amount)=>{
    const p=state.players?.[pid];if(!p)return 0;
    const actual=amount<0?Math.max(-Math.max(0,p[key]||0),amount):amount;
    p[key]=Math.max(0,(p[key]||0)+actual);
    const result=changes.get(pid)||{capital:0,influence:0,prestige:0};
    result[key]+=actual;
    changes.set(pid,result);
    return actual;
  };
  const protectedByService=new Set();
  const results=[];
  for(const e of entries){
    if(card.delta<0&&e.stationOwners?.length){
      for(const pid of e.stationOwners)protectedByService.add(pid);
    }
    if(card.delta<0&&e.defended){
      results.push({...e,actual:0});
      continue;
    }
    const actual=write(e.playerId,card.resource,card.delta);
    results.push({...e,actual});
  }
  // Once per issue, not per protected building/region. Any service owner
  // that prevented actual eligibility for a penalty receives recognition.
  if(card.delta<0)for(const pid of protectedByService)write(pid,'influence',1);
  const report={year:newsYear(state.round),round:state.round,
    cardId:card.id,title:card.title,category:card.category,
    entries:results,changes:Object.fromEntries(changes),
    serviceRecognition:[...protectedByService],emergency:{...state.newsEmergency}};
  state.newsArchive.push(report);
  state.newsLastResolvedRound=state.round;
  const message=[...changes].map(([pid,d])=>{
    const player=state.players[pid];
    return player.name+' ('+Object.entries(d).filter(([,n])=>n!==0).map(([k,n])=>
      (k==='capital'?'$':k==='influence'?'Влияние ':'ПО ')+(n>0?'+':'')+n).join(', ')+')';
  }).join('; ')||'изменений нет';
  logEvent(state,'The San Francisco Call, '+report.year+' · Итоги: «'+card.title+'». '+message+'.','accent');
  return {ok:true,report};
}
