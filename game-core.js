import {NEWS_CARDS,newsCard,newsYear} from './newspaper-cards.js';

export const PLAYER_NAMES = ['Синий','Красный','Зелёный'];
export const PLAYER_KEYS = ['blue','red','green'];
export const MAX_ROUNDS = 6;
export const RESOURCE_PRICES = {Lumber:1,Masonry:1,Steel:2};
export const BASE_ROUND_INCOME = 3;
export const CONSTRUCTION_UPKEEP_COST = 1;
export const INFLUENCE_START_POSITIONS = Object.freeze([2,3,4]);
export const RAISE_CAPITAL_AMOUNT = 3;
export const LOAN_PRINCIPAL = 6;
export const MAX_ACTIVE_LOANS = 2;
export const BUREAU_LAND_DISCOUNT = 2;
export const HAND_LIMIT = 5;
export const STARTER_DRAFT_SIZE = 5;
export const STARTER_KEEP = 2;
export const WORKERS_PER_PLAYER = 3;
export const MAX_SUSPICION = 3;
export const STARTING_WORKER_DISTRICT = 'civic';
export const PROJECT_COPIES = 2;
export const LAND_VALUE_COMPLETION_CHANGE = {std_fire:1,std_police:1,std_clinic:1,factory:-1,firehouse:1,clinic:1,police:1,publicworks:1,school:1,streetcar:1,fireworkshop:1};
export const BUILDING_TYPES = Object.freeze(['Жилое','Бизнес','Промышленное','Общественное','Торговое']);
export const MARKET_STREET_DISTRICTS = Object.freeze(['noe','mission','civic','soma','financial']);
export const POOR_GROUND_DISTRICTS = Object.freeze(['marina','financial','soma','mission','missionbay']);
export const STABLE_GROUND_DISTRICTS = Object.freeze(['pacific','chinatown']);

export const LOGISTICS_RESOURCE_WEIGHTS = {Lumber:0.40,Masonry:0.35,Steel:0.25};
export const CONSTRUCTION_STAGING_CAPACITY = 3;
export const WAGON_UPGRADE_PRICE = 2;
export const WAGON_MAX_LEVEL = 3;
export const WAREHOUSE_STORAGE_CAPACITY = 5;
export const FREIGHT_YARD = {id:'freightyard',name:'Городской грузовой двор',shortName:'Грузовой двор',districtId:'western',capacityPerPlayer:2,rentCost:2,x:570,y:375};
export const DELIVERY_EDGE_COST = 1;
export const DELIVERY_EXTRA_LOADING_COST = 1;
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

export const NEUTRAL_MATERIAL_SUPPLIERS = Object.freeze([
  {id:'gray-quarry',name:'Gray Brothers Quarry',shortName:'Gray Bros. Quarry',districtId:'noe',resource:'Masonry',unitPrice:3,x:668,y:807,code:'К',historical:'Каменоломня · Noe Valley'},
  {id:'engle-lumber',name:'Engle & Son Lumber Yard',shortName:'Engle & Son',districtId:'marina',resource:'Lumber',unitPrice:3,x:692,y:151,code:'Д',historical:'Lumber yard · Fillmore & Francisco'},
  {id:'axford-iron',name:'Axford Bros. Iron Foundry',shortName:'Axford Bros.',districtId:'mission',resource:'Steel',unitPrice:5,x:844,y:688,code:'С',historical:'Iron foundry · 2256 Harrison'}
]);

export const CITY_GOAL_COPIES = 3;
export const CITY_GOALS = Object.freeze([
  {id:'C01',name:'Западная жилая экспансия',sponsor:'Western Land & Improvement Syndicate',
    requirement:'2 Жилых здания в 2 разных западных районах',
    reward:{capital:4,prestige:4,influence:0},failPrestige:2,
    flavor:'Частный синдикат продвигает жилое расширение к западу от старого городского ядра.'},
  {id:'C02',name:'Новый деловой центр',sponsor:'Downtown Property Association',
    requirement:'2 Бизнес-здания в Financial / Civic Center / SoMa',
    reward:{capital:5,prestige:4,influence:0},failPrestige:3,
    flavor:'Землевладельцы и предприниматели добиваются концентрации новой деловой застройки.'},
  {id:'C03',name:'Промышленный узел',sponsor:'San Francisco Industrial & Freight Association',
    requirement:'Промышленное + Торговое в одном районе с Port или Rail',
    reward:{capital:6,prestige:5,influence:0},failPrestige:4,
    flavor:'Грузовые интересы связывают производство, хранение и доступ к региональным перевозкам.'},
  {id:'C04',name:'Расширение городских служб',sponsor:'Board of Public Works',
    requirement:'2 разных Общественных здания в 2 разных районах',
    reward:{capital:4,prestige:5,influence:1},failPrestige:4,
    flavor:'Город требует распределять муниципальные службы между растущими районами.'},
  {id:'C05',name:'Новый квартал Mission Bay',sponsor:'Mission Bay Development Syndicate',
    requirement:'3 здания в Mission Bay, минимум 2 разных типа',
    reward:{capital:8,prestige:7,influence:0},failPrestige:5,
    flavor:'Спекулятивный синдикат пытается превратить прибрежные земли Mission Bay в новый городской квартал.'}
]);
export function cityGoalById(id){return CITY_GOALS.find(g=>g.id===id)||null;}
export function createCityGoalPool({rng=Math.random}={}){
  const market=CITY_GOALS.map((g,i)=>({uid:`G0-${i+1}-${g.id}`,id:g.id}));
  const deck=[];let serial=1;
  for(let copy=1;copy<CITY_GOAL_COPIES;copy++)for(const goal of CITY_GOALS)deck.push({uid:`GD${serial++}-${goal.id}`,id:goal.id});
  return {market,deck:shuffle(deck,rng),discard:[]};
}

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
  {prestige:1,income:0,id:'bakery',types:['Жилое','Торговое'],risk:{earthquake:0,fire:2},name:'Семейная пекарная артель',type:'Жильё / Торговля',open:4,materials:['Lumber','Lumber','Masonry'],requires:'Нет дополнительных требований',effect:'Доход $0 · Престиж +1 · Пекарный сезон: 1 Дерево → $7 или +1 VP (быстрое действие, раз в год)',benefit:'1 VP при завершении · раз в год 1 Lumber → $7 либо +1 VP',actionName:'Пекарный сезон',actionText:'Быстрое действие: израсходуйте 1 Lumber в пекарне или собственном складе этого района, выберите $7 либо +1 VP. Один раз в год.',limits:'Работает только после завершения; свой ресурс, обычная доставка и доступ к своему ходу; пекарня хранит максимум 1 Lumber.'},
  {prestige:3,income:0,id:'orphanage',types:['Жилое','Общественное'],risk:{earthquake:1,fire:0},name:'Сиротский приют',type:'Жильё / Городская служба',open:4,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Престиж +3 и Политическое влияние +1 при завершении · +4 VP после катастрофы 1906, если не уничтожен',benefit:'3 VP +1 Влияние при завершении · ещё 4 VP при выживании после землетрясения и пожаров',actionName:'Уцелевший приют',actionText:'После всех землетрясений и пожаров 1906 получите +4 VP, если приют цел или повреждён. Разрушенный или сгоревший не получает бонус.',limits:'Не является пожарным, полицейским или медицинским учреждением; бонус 1906 учитывается однократно после Фазы II.'},
  {prestige:1,income:2,id:'tenement',types:["Жилое"],risk:{earthquake:0,fire:1},name:'Рабочий доходный дом',type:'Жильё',open:2,materials:['Lumber','Lumber','Masonry'],requires:'Нет дополнительных требований',effect:'Доход +2 · много жителей · Престиж +1',benefit:'Доход +2 / раунд · Престиж +1 · много жителей',actionName:'—',actionText:'Отдельного действия нет.',limits:'Нет дополнительных ограничений.'},
  {prestige:0,income:3,id:'speculative',types:["Жилое"],risk:{earthquake:1,fire:1},name:'Спекулятивный жилой комплекс',type:'Жильё',open:3,materials:['Lumber','Lumber','Lumber'],requires:'Стоимость земли ≤2',effect:'Доход +3 · очень много жителей · высокий риск',landMax:2,benefit:'Доход +3 / раунд · Престиж 0 · очень много жителей',actionName:'—',actionText:'Отдельного действия нет.',limits:'Только Стоимость земли ≤2. Высокий риск в будущей катастрофе.'},
  {prestige:3,income:3,id:'luxury',types:["Жилое"],risk:{earthquake:0,fire:0},name:'Роскошные апартаменты',type:'Жильё',open:5,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Стоимость земли 3+ · Пожарная защита',accessAll:['fire'],effect:'Доход +3 · Престиж +3',landMin:3,benefit:'Доход +3 / раунд · Престиж +3',actionName:'—',actionText:'Отдельного действия нет.',limits:'Стоимость земли 3+ и Пожарная защита.'},
  {prestige:2,income:1,id:'cottages',types:["Жилое"],risk:{earthquake:0,fire:1},name:'Пригородные викторианские коттеджи',type:'Жильё',open:3,materials:['Lumber','Lumber','Masonry'],requires:'Нет дополнительных требований',effect:'Доход +$1 / год · +2 VP · при завершении первым в районе +$2',benefit:'Доход +$1 / год · +2 VP · освоение нового района +$2',actionName:'Освоение территории',actionText:'При завершении в районе без других завершённых зданий любых игроков получите +$2 один раз.',limits:'Бонус проверяется в момент завершения; незавершённые стройки не учитываются, премия не повторяется.'},
  {prestige:2,income:4,id:'brickapartments',types:["Жилое"],risk:{earthquake:2,fire:0},name:'Кирпичный многоквартирный дом',type:'Жильё',open:4,materials:['Lumber','Masonry','Masonry','Steel','Steel'],requires:'Стоимость земли 2+',landMin:2,effect:'Доход +$4 / год · +2 VP · уязвимость района У +2',benefit:'Доход +$4 / год · +2 VP · капитальная застройка с высоким риском У',actionName:'—',actionText:'Отдельного действия нет. Материалы (5) требуют склада в том же районе для завершения.',limits:'Стоимость земли 2+. У +2 и П 0 изменяют риск всего района. 5 материалов: стандартное ограничение стройплощадки 3.'},
  {prestige:1,income:2,id:'shops',types:["Торговое"],risk:{earthquake:0,fire:1},name:'Торговый ряд',type:'Коммерция',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Стоимость земли 1+',effect:'Доход +2 · Действие «Закупка» · Престиж +1',landMin:1,benefit:'Доход +2 / раунд · Престиж +1',actionName:'Закупка',actionText:'1 представитель + $1 → до 2 материалов по $0 в следующих Доставка этой активации.',limits:'Нужна незавершённая стройка · 1 использование / здание / раунд · при чужом использовании $1 получает владелец.'},
  {prestige:3,income:4,id:'hotel',types:["Бизнес"],risk:{earthquake:0,fire:0},name:'Гранд-отель',type:'Коммерция',open:6,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Стоимость земли 3+ · Пожарная защита · Доступ к клинике',accessAll:['fire','clinic'],effect:'Доход +4 · Престиж +3',landMin:3,benefit:'Доход +4 / раунд · Престиж +3',actionName:'—',actionText:'Отдельного действия нет.',limits:'Стоимость земли 3+ · Пожарная защита · Доступ к клинике.'},
  {prestige:1,income:2,id:'bank',types:["Бизнес"],risk:{earthquake:0,fire:0},name:'Частный банк',type:'Коммерция',open:6,materials:['Masonry','Masonry','Steel','Steel'],requires:'Стоимость земли 2+',effect:'Доход +2 · Действие «Банковский кредит» · Престиж +1',landMin:2,benefit:'Доход +2 / раунд · Престиж +1',actionName:'Банковский кредит',actionText:'1 представитель → 1-й активный кредит +$6; 2-й +$5. Каждый кредит: долг $6 и −$1 к Доход.',limits:'Макс. 2 активных кредита · 1 использование / банк / раунд · чужое использование даёт владельцу +1 Влияние максимум 1×/round.'},
  {prestige:2,income:2,id:'club',types:["Бизнес","Торговое"],risk:{earthquake:0,fire:1},name:'Ресторан и клуб',type:'Коммерция',open:4,materials:['Lumber','Masonry','Masonry'],requires:'Стоимость земли 2+',effect:'Доход +2 · Действие «Ужин и связи» · Престиж +2',landMin:2,benefit:'Доход +2 / раунд · Престиж +2',actionName:'Ужин и связи',actionText:'1 представитель + $1 → +1 Влияние.',limits:'1 использование / здание / раунд · если использует соперник, его $1 получает владелец.'},
  {prestige:1,income:2,id:'warehouse',types:["Торговое"],risk:{earthquake:0,fire:1},name:'Распределительный склад',type:'Логистика',open:4,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Доход +2 · Хранение 5 · Престиж +1',benefit:'Доход +2 / раунд · Престиж +1 · хранит до 5 ресурсов и снабжает стройки в этом районе',actionName:'—',actionText:'Может быть источником и точкой разгрузки Доставка.',limits:'Хранение 5 ресурсов.'},
  {prestige:0,income:5,id:'factory',types:["Промышленное"],risk:{earthquake:1,fire:2},name:'Крупная фабрика',type:'Промышленность',open:5,materials:['Lumber','Masonry','Masonry','Steel','Steel'],requires:'Доступ к ж/д или порту',accessAny:['rail','port'],effect:'Доход +5 · Стоимость земли −1',benefit:'Доход +5 / раунд · Престиж 0 · после завершения Стоимость земли района −1',actionName:'—',actionText:'Отдельного действия нет.',limits:'Только Доступ к ж/д или порту. Стоимость земли не падает ниже 0.'},

  {prestige:1,income:1,id:'brickworks',types:["Промышленное"],risk:{earthquake:1,fire:1},name:'Кирпичный завод',type:'Промышленность',open:4,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Доход +1 · производит до 2 Masonry в год; продажа по $1/шт.',benefit:'Доход +$1 / год · запас до 2 Masonry · +1 VP',actionName:'Продажа кирпича',actionText:'Цена $1 за Masonry. Владелец покупает 2 Masonry одной погрузкой за $1. За одну покупку соперника владелец получает $1, даже если куплено 2.',limits:'Запас максимум 2 Masonry; доступны все игроки. Скидка только владельцу при одновременной покупке двух; обычная перевозка обязательна.'},
  {prestige:1,income:2,id:'woodworks',types:["Промышленное"],risk:{earthquake:0,fire:2},name:'Деревообрабатывающая фабрика',type:'Промышленность',open:4,materials:['Lumber','Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Доход +2 · один раз в год +$2 при завершении собственного жилого здания в этом или соседнем районе',benefit:'Доход +$2 / год · строительная премия +$2 (раз в год) · +1 VP',actionName:'—',actionText:'Автоматически +$2 при завершении собственного жилого здания в районе фабрики или соседнем; 1 раз за год на фабрику.',limits:'Только новое завершённое Жилое здание владельца; бонус не начисляется задним числом.'},
  {prestige:1,income:2,id:'foundry',types:["Промышленное"],risk:{earthquake:1,fire:2},name:'Литейно-механический завод',type:'Промышленность',open:6,materials:['Lumber','Masonry','Steel','Steel'],requires:'Нет дополнительных требований',effect:'Доход +2 · производит до 1 Steel в год; продажа по $2/шт.',benefit:'Доход +$2 / год · запас до 1 Steel · +1 VP',actionName:'Продажа стали',actionText:'Steel за $2/шт. Для владельца цена $1/шт. При покупке соперником владелец получает $1 за Steel.',limits:'Запас максимум 1 Steel; доступны все игроки. Скидка при покупке собственной продукции; обычная перевозка обязательна.'},
  {prestige:1,income:1,id:'cannery',types:["Промышленное"],risk:{earthquake:0,fire:1},name:'Консервный завод',type:'Промышленность',open:4,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Доход +1; ещё +$1 за каждое завершённое Жилое здание в своём районе (максимум +$3)',benefit:'Доход +$1–4 / год (по жилой застройке) · +1 VP',actionName:'—',actionText:'Дополнительный доход пересчитывается ежегодно; учитываются завершённые жилые здания любых игроков в том же районе.',limits:'Максимум +$3 дополнительно за год; соседние районы не учитываются.'},
  {prestige:1,income:0,id:'bureau',types:["Бизнес"],risk:{earthquake:0,fire:0},name:'Строительное бюро',type:'Коммерция',open:4,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Строительный контракт · −$2 к Стоимость земли · Престиж +1',benefit:'Престиж +1 · Доход 0',actionName:'Строительный контракт',actionText:'1 представитель → следующая платная земля дешевле до $2.',limits:'Макс. 1 сохранённый контракт · 1 использование / здание / раунд · чужое использование приносит владельцу $1.'},
  {prestige:1,income:3,id:'insurance',types:["Бизнес"],risk:{earthquake:0,fire:0},name:'Страховая компания',type:'Коммерция',open:5,materials:['Masonry','Masonry','Steel'],requires:'Стоимость земли 2+',effect:'Доход +3 · Престиж +1 · страховые действия позже',landMin:2,benefit:'Доход +3 / раунд · Престиж +1',actionName:'Страхование',actionText:'Страховое действие ещё не активно в текущем прототипе.',limits:'Стоимость земли 2+. Механика страхования будет добавлена позже.'},
  {prestige:3,income:0,id:'firehouse',types:["Общественное"],risk:{earthquake:0,fire:-1},name:'Муниципальная пожарная часть',type:'Городская служба',open:3,materials:['Lumber','Masonry','Steel'],requires:'Муниципальный участок',effect:'Пожарная защита (район + соседний район) · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · Пожарная защита',actionName:'—',actionText:'Отдельного действия пока нет.',limits:'Пожарная защита действует в своём и соседнем районе. Municipal site пока не проверяется.'},
  {prestige:3,income:0,id:'police',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Городской полицейский участок',type:'Городская служба',open:3,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Обеспечивает общественный порядок в районе и соседних районах · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · предотвращает события преступности в своём и соседних районах',actionName:'—',actionText:'Автоматическая защита от криминальных событий, без дополнительного действия.',limits:'Не суммируется с защитой другого участка, не защищает от землетрясения.'},
  {prestige:3,income:0,id:'clinic',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Районная клиника',type:'Городская служба',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Нет дополнительных требований',effect:'Доступ к клинике (район + соседний район) · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · Доступ к клинике',actionName:'—',actionText:'Отдельного действия пока нет.',limits:'Доступ к клинике действует в своём и соседнем районе.'},
  {prestige:2,income:0,id:'school',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Муниципальная начальная школа',type:'Городская служба',open:4,materials:['Lumber','Masonry','Masonry'],requires:'Нет дополнительных требований',effect:'Стоимость земли района +1 · +2 VP и до +2 VP за завершённое жильё в этом и соседних районах',benefit:'2–4 VP однократно · Стоимость земли района +1',actionName:'Развитый жилой квартал',actionText:'При завершении школы получите +1 VP за каждое завершённое жилое здание в этом или соседних районах (любого владельца), максимум +2 VP.',limits:'Бонус школы единовременный, только при завершении; будущие жилые здания не дают VP задним числом.'},
  {prestige:3,income:0,id:'publicworks',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Депо городских работ',type:'Городская служба',open:4,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Инфраструктура воды / газа / ремонта · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · Инфраструктура воды / газа / ремонта',actionName:'—',actionText:'Отдельное действие ещё не активно.',limits:'Полные воды / газа / ремонта правила будут добавлены позже.'},
  {prestige:1,income:1,id:'wholesale_market',types:['Торговое'],risk:{earthquake:0,fire:2},name:'Городской оптовый рынок',type:'Коммерция',open:3,materials:['Lumber','Lumber','Masonry'],requires:'Нет дополнительных требований',effect:'Доход +$1/год · +$3 за новую категорию здания в районе',benefit:'Доход +$1/год · +1 VP · +$3 владельцу за новую категорию',actionName:'Новые отрасли',actionText:'После завершения любого другого здания в этом районе, если появилась ранее отсутствовавшая категория, получите $3. Для смешанного здания максимум $3.',limits:'Учитываются постройки всех игроков; повторные категории не оплачиваются. Бонус не начисляется за постройки, завершённые до открытия рынка.'},
  {prestige:1,income:2,id:'commission_house',types:['Торговое'],risk:{earthquake:0,fire:1},name:'Комиссионный торговый дом',type:'Коммерция',open:4,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Доход +$2/год · продажа неначатого проекта за $4',benefit:'Доход +$2/год · +1 VP · продажа проекта',actionName:'Перепродажа проекта',actionText:'1 представитель → сбросьте одну карту неначатого проекта из своей руки и получите $4.',limits:'Любая карта руки, включая стартовую и купленную на аукционе. Требуется доступ представителя к району здания. Одна активация ячейки здания за год.'},
  {prestige:1,income:2,id:'pub',types:['Торговое'],risk:{earthquake:0,fire:1},name:'Городская пивная',type:'Коммерция',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Нет дополнительных требований',effect:'Доход +$2/год · принимает пиво (+$1 владельцу за партию)',benefit:'Доход +$2/год · +1 VP · принимает пиво',actionName:'Приём пива',actionText:'Принимает Пиво. +$1 за каждую успешно доставленную партию по общему правилу торговли (после включения системы Товары).',limits:'Приём пива активируется вместе с системой розовых торговых кубиков. До этого действует базовый доход.'},
  {prestige:4,income:7,id:'skyscraper',types:['Бизнес'],largeBuilding:true,risk:{earthquake:0,fire:1},name:'Стальной деловой небоскрёб',type:'Коммерция',open:7,materials:['Lumber','Masonry','Masonry','Steel','Steel','Steel'],requires:'Стоимость земли 3+ · склад для завершения',landMin:3,effect:'Крупное здание · Доход +$7/год · 4 VP · занимает 1 место',benefit:'Крупное здание · Доход +$7/год · +4 VP',actionName:'—',actionText:'Отдельного действия нет. 6 материалов требуют хранения сверх лимита стройплощадки 3.',limits:'Стоимость земли 3+ · одно место в районе. Для завершения нужен собственный склад в том же районе.'},
  {prestige:0,income:1,id:'wagonboarding',types:['Жилое','Бизнес'],risk:{earthquake:0,fire:1},name:'Вагонный пансион «Виста-дель-Мар»',type:'Жильё',open:3,materials:['Lumber','Lumber'],requires:'Только западные районы: Outer/Inner Sunset, Outer/Inner Richmond',wagonDistricts:['sunset','innersunset','outerrichmond','innerrichmond'],effect:'Доход $1/$2/$3 · быстрое расширение за $2 · перестройка возвращает 1/2/3 Lumber',benefit:'Стартовый доход +$1/год · 0 VP; уровень II/III: +$2/+$3 дохода, П+2/П+3',actionName:'Пристройка / перестройка',actionText:'Быстрое действие без рабочего: $2, +1 уровень (раз в год). Основное действие рабочего: заменить пансион другим проектом на том же участке без повторной покупки земли, засчитав Lumber по уровню.',limits:'Максимум уровень III; один апгрейд в год на здание; максимум 3 Lumber при перестройке, без излишка, staging=3; нельзя перестроить в такой же пансион.'},
  {prestige:0,income:1,id:'sailorlodging',types:['Жилое','Бизнес'],risk:{earthquake:1,fire:2},name:'Матросская ночлежка',type:'Жильё',open:3,materials:['Lumber','Lumber','Lumber'],requires:'Только район с действующим снабженческим портом',effect:'Доход +$1/год · вербовка после портовой погрузки: законно +$2 или незаконно +$6 и −1 Влияние',benefit:'После погрузки любого игрока в портовом узле района — комиссия за вербовку раз в год, выбор немедленно',actionName:'Вербовка экипажа',actionText:'Обычная +$2; незаконная +$6 и −1 шаг Политического влияния. Незаконная недоступна при Влиянии 0.',limits:'Одна вербовка на ночлежку за год независимо от числа погрузок, не действует от Gas House Cove, не вводит шкалу коррупции.'},
  {prestige:3,income:4,id:'press_tower',types:['Бизнес','Промышленное'],risk:{earthquake:0,fire:1},name:'Газетный небоскрёб',type:'Коммерция',open:6,materials:['Lumber','Masonry','Masonry','Steel','Steel'],requires:'Стоимость земли 3+; крупное здание, 5 материалов',landMin:3,effect:'Доход +$4/год · 3 VP · после годового газетного выпуска: +$2 ИЛИ −$2 и +1 Влияние',benefit:'Газетная кампания после каждого ежегодного выпуска · выбор без рабочего',actionName:'Газетная кампания',actionText:'После подведения итогов газеты автоматически выберите +$2 или уплатите $2, чтобы повысить Влияние на 1 шаг. Один раз за год на небоскрёб, включая 1905.',limits:'Выбор после газетных последствий, до годового дохода; платёж — из имеющихся денег, никаких авансов; без действия рабочего.'},
  {prestige:0,income:0,id:'workers_complex',types:['Жилое','Промышленное'],risk:{earthquake:1,fire:2},name:'Фабричный рабочий корпус с ночной сменой',type:'Промышленность',open:3,materials:['Lumber','Lumber','Masonry'],requires:'В районе есть собственная завершённая фабрика или завод, не привязанные к другому корпусу',effect:'Нет собственного дохода · удваивает ежегодный доход выбранной фабрики/завода и её выпуск строительных материалов',benefit:'Ночная смена ×2: доход одной фабрики/завода; Brickworks 2→4 Masonry/год, Foundry 1→2 Steel/год',actionName:'Ночная смена',actionText:'При завершении выбрать одну собственную завершённую фабрику или завод в том же районе. Удваиваются ежегодный доход предприятия и производственная мощность (если производит материалы). Привязка постоянна и не суммируется.',limits:'Подходят Крупная фабрика, Кирпичный завод, Деревообрабатывающая фабрика, Литейно-механический и Консервный завод. Две ночные смены на одно предприятие запрещены; разовая премия деревообработки не удваивается. Комплекс сам не приносит дохода.'},
  {prestige:2,income:1,id:'fireworkshop',types:['Промышленное','Общественное'],risk:{earthquake:0,fire:-1},name:'Пожарно-технические мастерские',type:'Городская служба',open:5,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',effect:'Доход +1 · Престиж +2 · П −1 · стоимость земли +1 · улучшает Пожарные части в своём и соседних районах',benefit:'Доход +1/год · +2 VP · пожарная часть рядом: ремонт $1 и инспекция соседних районов',actionName:'Обслуживание пожарных частей',actionText:'Пассивно: части в своём или соседнем районе проводят добровольную модернизацию за $1 вместо $2, а инспекции — и в соседних районах.',limits:'Действия проводятся представителем через Пожарную часть, один раз за год на станцию. Мастерские сами действий не дают.'},
]

// Existing v0.44-L1 saves may contain a started/completed streetcar project.
// Keep its historical definition only for rendering and completing those saves;
// RETIRED_PROJECTS never enters the market, starter draft or new construction.
/** Unlimited municipal basics, not in the auction/draft pool. */
export const STANDARD_PROJECTS=Object.freeze([
 {id:'std_warehouse',standard:true,types:['Торговое'],prestige:1,income:0,risk:{earthquake:0,fire:1},name:'Строительный склад',type:'Логистика',open:0,materials:['Lumber','Masonry','Steel'],warehouseCapacity:3,requires:'Без тендера. Любое число складов в районе.',effect:'Хранение 3 материалов, доступ владельца для доставок и строительства.',benefit:'1 VP · доход $0 · вместимость 3',actionName:'—',actionText:'Обычная строительная площадка.',limits:'Доступен всем игрокам в любое время; один рабочий для начала строительства.'},
 {id:'std_fire',standard:true,service:'firehouse',types:['Общественное'],prestige:1,income:0,risk:{earthquake:0,fire:-1},name:'Пожарный пост',type:'Городская служба',open:0,materials:['Lumber','Masonry','Steel'],requires:'Нет другого пожарного учреждения любого уровня в районе.',effect:'П −1 и пожарная защита своего района для всех · земля +1',benefit:'1 VP · $0/год · общая пожарная защита',actionName:'—',actionText:'Пожарная защита своего района, без действия рыночной части.',limits:'В районе только один пожарный объект любого уровня.'},
 {id:'std_police',standard:true,service:'police',types:['Общественное'],prestige:1,income:0,risk:{earthquake:0,fire:0},name:'Полицейский пост',type:'Городская служба',open:0,materials:['Lumber','Masonry','Steel'],requires:'Нет другого полицейского учреждения любого уровня в районе.',effect:'Полицейское присутствие своего района для всех · земля +1',benefit:'1 VP · $0/год · общая полиция',actionName:'—',actionText:'Полицейское присутствие своего района; газетные механики отдельно.',limits:'В районе только один полицейский объект любого уровня.'},
 {id:'std_clinic',standard:true,service:'clinic',types:['Общественное'],prestige:1,income:0,risk:{earthquake:0,fire:0},name:'Районная амбулатория',type:'Городская служба',open:0,materials:['Lumber','Masonry','Steel'],requires:'Нет другого медицинского учреждения любого уровня в районе.',effect:'Медицинская помощь своего района для всех · земля +1',benefit:'1 VP · $0/год · общая медицина',actionName:'—',actionText:'Доступ к медицине своего района; газетные механики отдельно.',limits:'В районе только один медицинский объект любого уровня.'}
]);
export const STANDARD_SERVICE_FAMILIES=Object.freeze({firehouse:Object.freeze(['firehouse','std_fire']),police:Object.freeze(['police','std_police']),clinic:Object.freeze(['clinic','std_clinic'])});
export function isStandardProject(id){return STANDARD_PROJECTS.some(p=>p.id===id);}
export function warehouseStorageCapacity(c){return c?.projectId==='std_warehouse'?3:c?.projectId==='warehouse'?WAREHOUSE_STORAGE_CAPACITY:0;}
export function isWarehouseConstruction(c){return warehouseStorageCapacity(c)>0;}
export function serviceFamilyForProject(id){return Object.keys(STANDARD_SERVICE_FAMILIES).find(k=>STANDARD_SERVICE_FAMILIES[k].includes(id))||null;}
export function completedCitywideServices(state,service){return (state.constructions||[]).filter(c=>c.status==='complete'&&STANDARD_SERVICE_FAMILIES[service]?.includes(c.projectId));}
export const RETIRED_PROJECTS = Object.freeze([{...{prestige:3,income:0,id:'streetcar',types:["Общественное"],risk:{earthquake:0,fire:0},name:'Трамвайное расширение и депо',type:'Инфраструктура',open:4,materials:['Lumber','Masonry','Steel'],requires:'Нет дополнительных требований',streetcarExtension:true,effect:'Трамвайное расширение · Стоимость земли +1 · Престиж +3',benefit:'Престиж +3 · Стоимость земли района +1 · трамвайная инфраструктура',actionName:'—',actionText:'Связь с Market Street будет доступна через исследование электрификации.',limits:'Нет дополнительных ограничений.'},retired:true}]);

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

export function projectById(id){return PROJECTS.find(p=>p.id===id) || STANDARD_PROJECTS.find(p=>p.id===id) || RETIRED_PROJECTS.find(p=>p.id===id) || null;}
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
// Effective pre-modernization fire risk can change as modular boarding houses grow.
export function constructionFireRisk(construction){
  const base=projectRisk(construction?.projectId).fire;
  const wagons=construction?.projectId==='wagonboarding'?Math.max(0,Math.min(WAGON_MAX_LEVEL,construction.wagonLevel||1)-1):0;
  return base+wagons;
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
    const base=projectRisk(construction.projectId);
    const fire=constructionFireRisk(construction);
    const delta={earthquake:base.earthquake,fire:fire-(construction.fireSafetyModernized&&fire>0?1:0)};
    if(!delta.earthquake&&!delta.fire)continue;
    const project=projectById(construction.projectId);
    sources.push({kind:'project',constructionId:construction.id,projectId:construction.projectId,ownerId:construction.playerId,label:(project?.name||construction.projectId)+(construction.fireSafetyModernized?' · 🛡 Модернизировано':''),earthquake:delta.earthquake,fire:delta.fire});
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
    used:false,
    jailed:false,
    arrestedRound:null
  }));
}
export function playerWorkers(state,playerId){return state.players?.[playerId]?.workers||[];}
// B1: imprisonment is an independent status, not an alias for used.
export function availableWorkers(state,playerId){return playerWorkers(state,playerId).filter(w=>!w.used&&!w.jailed);}
// B1 low-level worker transition retained for fixtures; public C1.2 arrestWorkerWithSanctions applies game penalties.
export function jailWorker(state,playerId,workerId){
  const player=state.players?.[playerId];
  if(!player)return {ok:false,reason:'player'};
  const worker=playerWorkers(state,playerId).find(w=>w.id===workerId);
  if(!worker)return {ok:false,reason:'worker'};
  if(worker.jailed)return {ok:false,reason:'already-jailed'};
  if(!Number.isInteger(state.round)||state.round<1)return {ok:false,reason:'round'};
  worker.jailed=true;
  worker.arrestedRound=state.round;
  if(state.activeWorkerId===worker.id){
    state.activeWorkerId=null;
    state.pendingWorkerAction=null;
    state.pendingConstruction=null;
  }
  syncWorkersLeft(state,playerId);
  logEvent(state,`${player.name}: представитель #${worker.number} арестован (год ${1899+state.round}).`,'bad');
  return {ok:true,worker,arrestedRound:worker.arrestedRound};
}
// Free replacement after a full following year: arrested in Y, jailed in Y+1, replaced in Y+2.
// The worker ID denotes a *staff slot*; a replacement retains the slot ID but resets location.
export function restoreExpiredJailedWorkerSlots(state,playerId){
  const player=state.players?.[playerId];
  if(!player)return {ok:false,reason:'player'};
  const restored=[];
  for(const worker of playerWorkers(state,playerId)){
    if(!worker.jailed||!Number.isInteger(worker.arrestedRound)||state.round<worker.arrestedRound+2)continue;
    worker.jailed=false;
    worker.arrestedRound=null;
    worker.districtId=STARTING_WORKER_DISTRICT;
    worker.used=false;
    restored.push(worker.id);
    logEvent(state,`${player.name}: после полного срока заключения штат бесплатно пополнен представителем #${worker.number} в Civic Center.`,'good');
  }
  syncWorkersLeft(state,playerId);
  return {ok:true,restored};
}
export function activeWorker(state,playerId){
  const id=state.activeWorkerId;
  if(!id)return null;
  const worker=playerWorkers(state,playerId).find(w=>w.id===id);
  return worker&&!worker.used&&!worker.jailed?worker:null;
}
export function workerCanReachDistrict(state,playerId,targetDistrictId,workerId=null){
  const worker=workerId?playerWorkers(state,playerId).find(w=>w.id===workerId):activeWorker(state,playerId);
  const target=districtById(targetDistrictId);
  if(!worker||worker.used||worker.jailed||!target||target.passable===false)return false;
  const local=worker.districtId===targetDistrictId||districtNeighbors(worker.districtId).includes(targetDistrictId);
  return local;
}
export function workerReachableDistricts(state,playerId,workerId=null){
  const worker=workerId?playerWorkers(state,playerId).find(w=>w.id===workerId):activeWorker(state,playerId);
  if(!worker||worker.used||worker.jailed)return [];
  const ids=[worker.districtId,...districtNeighbors(worker.districtId)];
  return [...new Set(ids)].filter(id=>districtById(id)?.passable!==false);
}
export function selectWorker(state,playerId,workerId){
  if(state.phase!=='development'||state.developmentComplete)return {ok:false,reason:'wrong-phase'};
  if(currentDeveloper(state)!==playerId)return {ok:false,reason:'turn'};
  if(state.activationMainActionUsed)return {ok:false,reason:'main-used'};
  const worker=playerWorkers(state,playerId).find(w=>w.id===workerId);
  if(!worker)return {ok:false,reason:'worker'};
  if(worker.jailed)return {ok:false,reason:'jailed'};
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
  const family=serviceFamilyForProject(serviceProjectId)||serviceProjectId;
  const ids=STANDARD_SERVICE_FAMILIES[family]||[serviceProjectId];
  const eligible=new Set([districtId,...districtNeighbors(districtId)]);
  return (state.constructions||[]).filter(c=>c.status==='complete'&&ids.includes(c.projectId)
    &&(c.projectId.startsWith('std_')?c.districtId===districtId:eligible.has(c.districtId)));
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
export function influenceOrder(state){
  const previous=Array.isArray(state?.yearTurnOrder)?state.yearTurnOrder:[];
  const fallbackIndex=id=>{const i=previous.indexOf(id);return i>=0?i:id;};
  return (state?.players||[]).map(p=>p.id).sort((a,b)=>
    (Number(state.players[b]?.influence)||0)-(Number(state.players[a]?.influence)||0)
    ||fallbackIndex(a)-fallbackIndex(b)
  );
}
export function setYearTurnOrderFromInfluence(state){
  const order=influenceOrder(state);
  state.yearTurnOrder=order;
  state.firstPlayer=order[0]??0;
  return [...order];
}
export function normalizeInfluenceTrack(state,{rng=Math.random,fresh=false}={}){
  if(!Array.isArray(state?.players)||!state.players.length)return [];
  if(fresh){
    const positions=shuffle(INFLUENCE_START_POSITIONS,rng);
    state.players.forEach((p,i)=>{p.influence=positions[i%positions.length];});
  }else{
    state.players.forEach(p=>{p.influence=Math.max(0,Math.floor(Number(p.influence)||0));});
    const values=state.players.map(p=>p.influence);
    if(new Set(values).size!==values.length){
      const prior=Array.isArray(state.yearTurnOrder)&&state.yearTurnOrder.length===state.players.length
        ?[...state.yearTurnOrder]
        :[0,1,2].map((_,i)=>((Number(state.firstPlayer)||0)+i)%state.players.length);
      const rank=[...state.players].sort((a,b)=>b.influence-a.influence||prior.indexOf(a.id)-prior.indexOf(b.id));
      let pos=Math.max(4,...rank.map(p=>p.influence));
      rank.forEach(p=>{p.influence=pos--;});
    }
  }
  return setYearTurnOrderFromInfluence(state);
}
export function moveInfluence(state,playerId,steps){
  const player=state?.players?.[playerId];
  let remaining=Math.abs(Math.trunc(Number(steps)||0));
  const sign=Math.sign(Number(steps)||0);
  const from=Number(player?.influence)||0;
  if(!player||!sign||!remaining)return {ok:!!player,from,to:from,steps:0,delta:0};
  const occupied=new Set(state.players.filter(p=>p.id!==playerId).map(p=>Math.max(0,Math.floor(Number(p.influence)||0))));
  let current=Math.max(0,Math.floor(from)),moved=0;
  while(remaining>0){
    let candidate=current+sign;
    while(candidate>=0&&occupied.has(candidate))candidate+=sign;
    if(candidate<0)break;
    current=candidate;moved+=sign;remaining--;
  }
  player.influence=current;
  return {ok:true,from,to:current,steps:moved,delta:current-from};
}
// C1.2: preview actual transitions rather than printed Influence coordinates.
// moveInfluence skips occupied positions: 3 on the track != 3 free steps.
export function arrestSanctionPreview(state,playerId){
  if(!Number.isInteger(playerId)||!state?.players?.[playerId])return {ok:false,reason:'player'};
  const from=Math.max(0,Math.floor(Number(state.players[playerId].influence)||0));
  const simulated={...state,players:state.players.map(p=>({...p}))};
  const move=moveInfluence(simulated,playerId,-3);
  const availableSteps=Math.abs(move.steps);
  const fullyPaid=availableSteps===3;
  // Approved fallback forces Influence to zero, even if another player
  // occupies 0 (a temporary tie at the floor); VP can be negative.
  const influenceAfter=fullyPaid?move.to:0;
  return {ok:true,playerId,availableSteps,from,influenceAfter,
    influenceDelta:influenceAfter-from,vpPenalty:fullyPaid?0:3,suspicionAfter:0};
}

// Single public C1.2 entry point for future criminal actions and year fines.
// B1 jailWorker remains a low-level transition for old fixtures/migrations.
export function arrestWorkerWithSanctions(state,playerId,workerId){
  if(!Number.isInteger(playerId)||!state?.players?.[playerId])return {ok:false,reason:'player'};
  const worker=playerWorkers(state,playerId).find(w=>w.id===workerId);
  if(!worker)return {ok:false,reason:'worker'};
  if(worker.jailed)return {ok:false,reason:'already-jailed'};
  if(!Number.isInteger(state.round)||state.round<1)return {ok:false,reason:'round'};
  const preview=arrestSanctionPreview(state,playerId);
  if(!preview.ok)return preview;
  const jail=jailWorker(state,playerId,workerId);
  if(!jail.ok)return jail;
  const player=state.players[playerId];
  const suspicionBefore=suspicionLevel(state,playerId);
  setSuspicion(state,playerId,0);
  if(preview.vpPenalty===0){
    moveInfluence(state,playerId,-3);
  }else{
    // 0, 1 or 2 available downward steps => Influence=0 and -3 VP.
    player.influence=0;
    player.prestige=(Number(player.prestige)||0)-3;
  }
  logEvent(state,`${player.name}: после ареста представителя #${worker.number} подозрение ${suspicionBefore}→0; влияние ${preview.from}→${player.influence} (${preview.availableSteps} доступных шагов вниз); ${preview.vpPenalty?'−3 VP':'без штрафа VP'}.`,'bad');
  return {ok:true,playerId,workerId:worker.id,worker,arrestedRound:jail.arrestedRound,
    suspicionBefore,suspicionAfter:0,availableInfluenceSteps:preview.availableSteps,
    influenceBefore:preview.from,influenceAfter:player.influence,
    influenceDelta:player.influence-preview.from,vpPenalty:preview.vpPenalty};
}

export function turnOrder(state){
  const stored=Array.isArray(state?.yearTurnOrder)?state.yearTurnOrder.filter(id=>state.players?.[id]):[];
  return stored.length===state.players?.length?[...stored]:setYearTurnOrderFromInfluence(state);
}
export function currentDeclarer(state){return state.declarationIndex<3?turnOrder(state)[state.declarationIndex]:null;}
// B2: a player's three annual activation opportunities exist even while staff is jailed.
// Kept independent of workersLeft: a service turn must not silently disappear.
export function ensureDevelopmentSlots(state){
  if(!Array.isArray(state.developmentSlotsUsed)||state.developmentSlotsUsed.length!==state.players.length){
    state.developmentSlotsUsed=state.players.map(p=>{
      const used=(p.workers||[]).filter(w=>w.used).length;
      return Math.min(WORKERS_PER_PLAYER,Math.max(0,used-(state.phase==='development'&&state.developmentPlayer===p.id&&state.activationMainActionUsed?1:0)));
    });
  }
  state.developmentSlotsUsed=state.developmentSlotsUsed.map(n=>Math.max(0,Math.min(WORKERS_PER_PLAYER,Number.isInteger(n)?n:0)));
  return state.developmentSlotsUsed;
}
export function developmentSlotsRemaining(state,playerId){
  const slots=ensureDevelopmentSlots(state);
  return Math.max(0,WORKERS_PER_PLAYER-(slots[playerId]||0));
}
export function currentDeveloper(state){return state.phase==='development'&&!state.developmentComplete?state.developmentPlayer:null;}
export function activeLoans(state,playerId){return state.players[playerId]?.loans||[];}
export function loanInterest(state,playerId){return activeLoans(state,playerId).length;}
export function completedActionSpaces(state,projectId){
  return (state.constructions||[]).filter(c=>c.projectId===projectId&&c.status==='complete');
}
export function canTakeMainAction(state,playerId){
  if((state.pendingSailorRecruitments||[]).length||(state.pendingWorkforceLinks||[]).length||(state.pendingPressCampaigns||[]).length)return false;
  const worker=activeWorker(state,playerId);
  return state.phase==='development'&&!state.developmentComplete&&currentDeveloper(state)===playerId
    &&developmentSlotsRemaining(state,playerId)>0&&(state.players[playerId]?.workersLeft??0)>0&&!state.activationMainActionUsed&&!!worker;
}
export function canUseFreeAction(state,playerId){
  if((state.pendingSailorRecruitments||[]).length||(state.pendingWorkforceLinks||[]).length||(state.pendingPressCampaigns||[]).length)return false;
  return state.phase==='development'&&!state.developmentComplete&&currentDeveloper(state)===playerId&&developmentSlotsRemaining(state,playerId)>0;
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

export function endActivation(state,playerId,{skipRemainingService=false}={}){
  if(state.phase!=='development'||state.developmentComplete)return {ok:false,reason:'wrong-phase'};
  if(currentDeveloper(state)!==playerId)return {ok:false,reason:'turn'};
  const remaining=developmentSlotsRemaining(state,playerId);
  if(!remaining)return {ok:false,reason:'no-activation-slots'};
  const available=availableWorkers(state,playerId).length;
  const serviceOnly=!state.activationMainActionUsed&&available===0;
  if(!state.activationMainActionUsed&&!serviceOnly)return {ok:false,reason:'main-action-required'};
  if(skipRemainingService&&!serviceOnly)return {ok:false,reason:'service-only'};
  const player=state.players[playerId];
  if((state.procurementRemaining||0)>0){
    logEvent(state,`${player.name} завершает Procurement; неиспользовано материалов: ${state.procurementRemaining}.`);
  }
  state.procurementRemaining=0;
  state.procurementSource=null;
  state.activeWorkerId=null;
  state.pendingWorkerAction=null;
  const consumed=skipRemainingService?remaining:1;
  const slots=ensureDevelopmentSlots(state);
  slots[playerId]+=consumed;
  if(state.players.every(p=>developmentSlotsRemaining(state,p.id)===0)){
    state.developmentPlayer=null;
    state.activationMainActionUsed=false;
    state.developmentComplete=true;
    logEvent(state,'Все девять окон активации завершены. Можно закончить Development Phase.','accent');
    return {ok:true,complete:true,nextPlayer:null,serviceOnly,slotsConsumed:consumed};
  }
  const order=turnOrder(state),at=order.indexOf(playerId);
  if(at<0)return {ok:false,reason:'turn-order'};
  for(let step=1;step<=order.length;step++){
    const pid=order[(at+step)%order.length];
    if(developmentSlotsRemaining(state,pid)>0){
      state.developmentPlayer=pid;
      state.activationMainActionUsed=false;
      logEvent(state,`${player.name} ${serviceOnly?'завершает сервисное окно':'завершает активацию'}${skipRemainingService?' и пропускает оставшиеся окна года':''}. Следующий: ${state.players[pid].name}.`);
      return {ok:true,complete:false,nextPlayer:pid,serviceOnly,slotsConsumed:consumed};
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
  if(pid>=state.players.length-1){state.phase='declare';state.starterDraftPlayer=null;state.declarationIndex=0;state.goalSessionClaims=[];logEvent(state,'Стартовый драфт завершён. Начинается City Hall Session: можно взять до 1 городской цели и заявить проект.','accent');return {ok:true,complete:true,nextPlayer:null};}
  state.starterDraftPlayer=pid+1;return {ok:true,complete:false,nextPlayer:state.starterDraftPlayer};
}


// Crime C1.1: company-wide suspicion, not a per-worker stat.
// State only: criminal effects, arrest sanctions and yearly fines are NOT enabled here.
export function normalizeSuspicion(value){
  if(!Number.isSafeInteger(value))return 0;
  return Math.max(0,Math.min(MAX_SUSPICION,value));
}
export function suspicionLevel(state,playerId){
  if(!Number.isInteger(playerId)||!state?.players?.[playerId])return null;
  return normalizeSuspicion(state.players[playerId].suspicion);
}
export function setSuspicion(state,playerId,level){
  if(!Number.isInteger(playerId)||!state?.players?.[playerId])return {ok:false,reason:'player'};
  if(!Number.isSafeInteger(level))return {ok:false,reason:'suspicion-level'};
  const player=state.players[playerId],from=normalizeSuspicion(player.suspicion),to=normalizeSuspicion(level);
  player.suspicion=to;
  return {ok:true,playerId,from,to,change:to-from};
}
export function changeSuspicion(state,playerId,delta){
  if(!Number.isSafeInteger(delta))return {ok:false,reason:'suspicion-delta'};
  if(!Number.isInteger(playerId)||!state?.players?.[playerId])return {ok:false,reason:'player'};
  const from=suspicionLevel(state,playerId);
  // Clamp before adding to avoid unsafe numeric overflow for very large signed deltas.
  const to=delta>=0?Math.min(MAX_SUSPICION,from+Math.min(delta,MAX_SUSPICION)):Math.max(0,from+Math.max(delta,-MAX_SUSPICION));
  return setSuspicion(state,playerId,to);
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
  const influencePositions=shuffle(INFLUENCE_START_POSITIONS,rng);
  const players=PLAYER_NAMES.map((name,id)=>({id,name,key:PLAYER_KEYS[id],capital:14,influence:influencePositions[id],prestige:0,suspicion:0,workers:createWorkers(id),workersLeft:WORKERS_PER_PLAYER,portfolio:[],loans:[],bureauContracts:0,goals:[],goalTakenRound:null,fireIncomePenalty:0}));
  const yearTurnOrder=players.map(p=>p.id).sort((a,b)=>players[b].influence-players[a].influence);
  const goalSetup=createCityGoalPool({rng});
  return {
    version:'0.44',
    industrialExpansionV1:true,
    housingSchoolExpansionV1:true,
    monoTradeExpansionV1:true,
    fireSafetyExpansionV1:true,
    boardingExpansionV1:true,
    pressAndWorkersExpansionV1:true,
    pendingWorkforceLinks:[],
    pendingPressCampaigns:[],
    pressCampaignQueuedRound:0,
    pendingSailorRecruitments:[],
    round:1,
    newsDeck,
    newsCurrentIds,
    marketExtendedForSixYears:true,
    newsArchive:[],
    newsEmergency:{},
    newsLastResolvedRound:0,
    firstPlayer:yearTurnOrder[0],
    yearTurnOrder,
    phase:'draft',
    view:'hall',
    declarationIndex:0,
    players,
    market,
    deck:pool,
    expired:[],
    goalMarket:goalSetup.market,
    goalDeck:goalSetup.deck,
    goalDiscard:goalSetup.discard,
    goalSessionClaims:[],
    lastGoalReports:[],
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
    yearTransition:null,
    developmentComplete:false,
    developmentSlotsUsed:players.map(()=>0),
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
    log:[{msg:'Началась тестовая партия v0.44 City Hall Goals. В City Hall каждый игрок может взять до 1 городской цели; выполненные цели отчитываются в начале следующего года.','cls':'accent'}],
    finished:false
  };
}

export function logEvent(state,msg,cls=''){state.log.push({msg,cls});}


function completedPlayerConstructions(state,playerId){
  return (state.constructions||[]).filter(c=>c.playerId===playerId&&c.status==='complete');
}
function combinations(items,count){
  const out=[];
  const walk=(start,pick)=>{
    if(pick.length===count){out.push([...pick]);return;}
    for(let i=start;i<=items.length-(count-pick.length);i++){pick.push(items[i]);walk(i+1,pick);pick.pop();}
  };
  walk(0,[]);return out;
}
function constructionHasType(c,type){return projectTypes(c.projectId).includes(type);}
function goalCandidateSets(state,playerId,goalId){
  const built=completedPlayerConstructions(state,playerId),sets=[];
  if(goalId==='C01'){
    const west=new Set(['outerrichmond','innerrichmond','sunset','innersunset']);
    for(const pair of combinations(built.filter(c=>west.has(c.districtId)&&constructionHasType(c,'Жилое')),2)){
      if(pair[0].districtId!==pair[1].districtId)sets.push(pair);
    }
  }else if(goalId==='C02'){
    const districts=new Set(['financial','civic','soma']);
    sets.push(...combinations(built.filter(c=>districts.has(c.districtId)&&constructionHasType(c,'Бизнес')),2));
  }else if(goalId==='C03'){
    for(const district of DISTRICTS.filter(d=>d.port||d.rail)){
      const here=built.filter(c=>c.districtId===district.id);
      for(const a of here.filter(c=>constructionHasType(c,'Промышленное'))){
        for(const b of here.filter(c=>c.id!==a.id&&constructionHasType(c,'Торговое')))sets.push([a,b]);
      }
    }
  }else if(goalId==='C04'){
    const civic=built.filter(c=>constructionHasType(c,'Общественное'));
    for(const pair of combinations(civic,2)){
      if(pair[0].districtId!==pair[1].districtId&&pair[0].projectId!==pair[1].projectId)sets.push(pair);
    }
  }else if(goalId==='C05'){
    const here=built.filter(c=>c.districtId==='missionbay');
    for(const trio of combinations(here,3)){
      const types=new Set(trio.flatMap(c=>projectTypes(c.projectId)));
      if(types.size>=2)sets.push(trio);
    }
  }
  return sets;
}
export function cityGoalEvaluation(state,playerId,goalEntryOrId){
  const goalId=typeof goalEntryOrId==='string'?goalEntryOrId:goalEntryOrId?.id;
  // Buildings completed before taking a City Hall goal count normally.
  // No retroactive registration, additional payments or special markers.
  const candidates=goalCandidateSets(state,playerId,goalId);
  const best=candidates[0]||null;
  return {complete:!!best,constructionIds:best?best.map(c=>c.id):[],
    progress:cityGoalProgress(state,playerId,goalId)};
}
export function cityGoalProgress(state,playerId,goalId){
  const built=completedPlayerConstructions(state,playerId);
  if(goalId==='C01'){
    const west=new Set(['outerrichmond','innerrichmond','sunset','innersunset']);
    return Math.min(2,new Set(built.filter(c=>west.has(c.districtId)&&constructionHasType(c,'Жилое')).map(c=>c.districtId)).size);
  }
  if(goalId==='C02')return Math.min(2,built.filter(c=>['financial','civic','soma'].includes(c.districtId)&&constructionHasType(c,'Бизнес')).length);
  if(goalId==='C03')return goalCandidateSets(state,playerId,goalId).length?2:Math.min(1,built.filter(c=>constructionHasType(c,'Промышленное')||constructionHasType(c,'Торговое')).length);
  if(goalId==='C04'){
    const civic=built.filter(c=>constructionHasType(c,'Общественное'));
    return goalCandidateSets(state,playerId,goalId).length?2:Math.min(1,civic.length);
  }
  if(goalId==='C05')return Math.min(3,built.filter(c=>c.districtId==='missionbay').length);
  return 0;
}
export function cityGoalTarget(goalId){return goalId==='C05'?3:2;}

export function claimCityGoal(state,slot){
  if(state.phase!=='declare')return {ok:false,reason:'wrong-phase'};
  const pid=currentDeclarer(state);if(pid==null)return {ok:false,reason:'no-declarer'};
  const player=state.players[pid];
  if(player.goalTakenRound===state.round)return {ok:false,reason:'already-taken'};
  const card=state.goalMarket?.[slot];if(!card)return {ok:false,reason:'empty-slot'};
  const goal=cityGoalById(card.id);if(!goal)return {ok:false,reason:'goal'};
  player.goals=player.goals||[];
  player.goals.push({uid:card.uid,id:card.id,status:'active',acquiredRound:state.round});
  player.goalTakenRound=state.round;
  state.goalMarket[slot]=null;
  state.goalSessionClaims=state.goalSessionClaims||[];
  state.goalSessionClaims.push({playerId:pid,uid:card.uid,id:card.id});
  logEvent(state,`${player.name} принимает городскую цель «${goal.name}». Отчёт возможен только в следующей City Hall Session.`,'accent');
  return {ok:true,playerId:pid,goalId:card.id};
}

export function reportCompletedCityGoals(state){
  const reports=[];
  for(const player of state.players){
    for(const entry of player.goals||[]){
      if(entry.status!=='active'||entry.acquiredRound>=state.round)continue;
      const goal=cityGoalById(entry.id),evaluation=cityGoalEvaluation(state,player.id,entry);
      if(!goal||!evaluation.complete)continue;
      player.capital+=goal.reward.capital||0;
      player.prestige=(player.prestige||0)+(goal.reward.prestige||0);
      let influenceMove=null;
      if(goal.reward.influence)influenceMove=moveInfluence(state,player.id,goal.reward.influence);
      entry.status='completed';entry.reportedRound=state.round;entry.matchedConstructionIds=evaluation.constructionIds;
      // Clear legacy metadata after reporting; old buildings are ordinary valid matches.
      delete entry.retroactiveCount;
      delete entry.preExistingConstructionIds;
      logEvent(state,`${player.name} отчитывает цель «${goal.name}»: +$${goal.reward.capital}, +${goal.reward.prestige} VP${goal.reward.influence?`, +${goal.reward.influence} Influence`:''}.`,'good');
      reports.push({playerId:player.id,goalId:goal.id,capital:goal.reward.capital,prestige:goal.reward.prestige,
        influence:goal.reward.influence||0,influenceMove});
    }
  }
  state.lastGoalReports=reports;
  return reports;
}

function drawGoalCard(state,rng=Math.random,excludeIds=new Set()){
  state.goalDeck=state.goalDeck||[];state.goalDiscard=state.goalDiscard||[];
  const recycle=()=>{if(!state.goalDeck.length&&state.goalDiscard.length)state.goalDeck=shuffle(state.goalDiscard.splice(0),rng);};
  recycle();
  let index=state.goalDeck.findIndex(card=>!excludeIds.has(card.id));
  if(index<0&&state.goalDiscard.length){
    state.goalDeck.push(...shuffle(state.goalDiscard.splice(0),rng));
    index=state.goalDeck.findIndex(card=>!excludeIds.has(card.id));
  }
  if(index<0)index=state.goalDeck.length?0:-1;
  return index>=0?state.goalDeck.splice(index,1)[0]:null;
}
export function refreshCityGoalMarket(state,{rng=Math.random}={}){
  state.goalMarket=Array.isArray(state.goalMarket)?state.goalMarket:Array(5).fill(null);
  const claims=(state.goalSessionClaims||[]).length;
  if(claims<state.players.length){
    for(const card of state.goalMarket)if(card)state.goalDiscard.push(card);
    state.goalMarket=Array(5).fill(null);
  }
  const present=new Set(state.goalMarket.filter(Boolean).map(card=>card.id));
  for(let i=0;i<5;i++){
    if(state.goalMarket[i])continue;
    const card=drawGoalCard(state,rng,present);if(!card)break;
    state.goalMarket[i]=card;present.add(card.id);
  }
  state.goalSessionClaims=[];
  return {claims,market:state.goalMarket};
}
export function failIncompleteCityGoals(state){
  const failures=[];
  for(const player of state.players){
    for(const entry of player.goals||[]){
      if(entry.status!=='active')continue;
      const goal=cityGoalById(entry.id);if(!goal)continue;
      player.prestige=Math.max(0,(player.prestige||0)-goal.failPrestige);
      entry.status='failed';entry.failedRound=state.round;
      logEvent(state,`${player.name} не выполнил цель «${goal.name}»: −${goal.failPrestige} VP.`,'bad');
      failures.push({playerId:player.id,goalId:goal.id,prestige:-goal.failPrestige});
    }
  }
  return failures;
}

export function claimProject(state,slot){
  if(state.phase!=='declare') return {ok:false,reason:'wrong-phase'};
  const pid=currentDeclarer(state); if(pid==null) return {ok:false,reason:'no-declarer'};
  const m=state.market[slot]; if(!m) return {ok:false,reason:'empty-slot'};
  if(!PROJECTS.some(p=>p.id===m.id))return {ok:false,reason:'retired-project'};
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

export function resolveTenders(state,{rng=Math.random}={}){
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
  const goalRefresh=refreshCityGoalMarket(state,{rng});
  state.phase='development';
  state.developmentSlotsUsed=state.players.map(()=>0);
  state.developmentPlayer=state.firstPlayer;
  state.developmentComplete=false;
  state.activationMainActionUsed=false;
  state.activeWorkerId=null;
  state.pendingWorkerAction=null;
  state.actionSpaceOccupancy={};
  state.bankOwnerRewarded={};
  state.bureauOwnerRewarded={};
  logEvent(state,`City Hall завершён. Целей взято: ${goalRefresh.claims}; рынок целей обновлён. Development Phase начинает ${state.players[state.developmentPlayer].name}.`,'accent');
  return {ok:true,goalRefresh};
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

export function upgradeWagonBoarding(state,playerId,constructionId){
  if(!canUseFreeAction(state,playerId))return {ok:false,reason:'not-active-player'};
  const con=(state.constructions||[]).find(c=>c.id===constructionId);
  if(!con||con.playerId!==playerId||con.projectId!=='wagonboarding'||con.status!=='complete')return {ok:false,reason:'boarding'};
  const level=Math.max(1,Math.min(WAGON_MAX_LEVEL,con.wagonLevel||1));
  if(level>=WAGON_MAX_LEVEL)return {ok:false,reason:'max-level'};
  if(con.wagonUpgradedRound===state.round)return {ok:false,reason:'already-upgraded'};
  if(state.players[playerId].capital<WAGON_UPGRADE_PRICE)return {ok:false,reason:'capital'};
  state.players[playerId].capital-=WAGON_UPGRADE_PRICE;
  con.wagonLevel=level+1;
  con.wagonUpgradedRound=state.round;
  logEvent(state,`${state.players[playerId].name} расширяет вагонный пансион в ${districtById(con.districtId).name} до уровня ${con.wagonLevel}: −$${WAGON_UPGRADE_PRICE}, доход +$1/год, П +1. Быстрое действие без рабочего.`,'accent');
  return {ok:true,level:con.wagonLevel,cost:WAGON_UPGRADE_PRICE};
}

export const WORKFORCE_ELIGIBLE_PROJECTS=Object.freeze(['factory','brickworks','woodworks','foundry','cannery']);
export function availableWorkforceTargets(state,playerId,districtId,exceptComplexId=null){
  const busy=new Set((state.constructions||[]).filter(c=>c.status==='complete'&&c.projectId==='workers_complex'&&c.id!==exceptComplexId&&c.linkedIndustryId).map(c=>c.linkedIndustryId));
  return (state.constructions||[]).filter(c=>c.status==='complete'&&c.playerId===playerId&&c.districtId===districtId
    &&WORKFORCE_ELIGIBLE_PROJECTS.includes(c.projectId)&&!busy.has(c.id));
}
export function currentWorkforceLink(state){
  return (state.pendingWorkforceLinks||[]).map(id=>(state.constructions||[]).find(c=>c.id===id))
    .find(c=>c&&c.projectId==='workers_complex'&&c.status==='complete'&&!c.linkedIndustryId)||null;
}
export function resolveWorkforceLink(state,complexId,targetId){
  const c=currentWorkforceLink(state);
  if(!c||c.id!==complexId)return {ok:false,reason:'no-pending'};
  const target=availableWorkforceTargets(state,c.playerId,c.districtId,c.id).find(x=>x.id===targetId);
  if(!target)return {ok:false,reason:'not-eligible'};
  c.linkedIndustryId=target.id;
  state.pendingWorkforceLinks.shift();
  logEvent(state,`${state.players[c.playerId].name} связывает рабочий корпус с «${projectById(target.projectId).name}» в ${districtById(c.districtId).name}; ежегодный доход и доступное производство материалов удваиваются.`,'good');
  return {ok:true,targetId};
}
export function hasWorkforceComplex(state,industry){
  if(!industry||industry.status!=='complete'||!WORKFORCE_ELIGIBLE_PROJECTS.includes(industry.projectId))return false;
  return (state.constructions||[]).some(c=>c.projectId==='workers_complex'&&c.status==='complete'
    &&c.playerId===industry.playerId&&c.districtId===industry.districtId&&c.linkedIndustryId===industry.id);
}
export function workforceIncomeBonus(state,industry){
  if(!industry||industry.status!=='complete'||!WORKFORCE_ELIGIBLE_PROJECTS.includes(industry.projectId))return 0;
  return hasWorkforceComplex(state,industry)?(projectById(industry.projectId)?.income||0)+canneryIncomeBonus(state,industry):0;
}
export function districtConstructionCount(state,districtId){
  return (state.constructions||[]).filter(c=>c.districtId===districtId&&!['abandoned','redeveloped'].includes(c.status)).length;
}
export function unfinishedConstructions(state,playerId=null){
  return (state.constructions||[]).filter(c=>c.status==='under-construction'&&(playerId==null||c.playerId===playerId));
}
export function constructionUpkeepDue(state,playerId){
  return unfinishedConstructions(state,playerId).length*CONSTRUCTION_UPKEEP_COST;
}

export function constructionEligibility(state,playerId,projectId,districtId,{redevelopId=null}={}){
  const reasons=[];
  const former=redevelopId?(state.constructions||[]).find(c=>c.id===redevelopId):null;
  const replacing=!!(former&&former.status==='complete'&&former.projectId==='wagonboarding'&&former.playerId===playerId&&former.districtId===districtId);
  if(redevelopId&&!replacing)reasons.push('Перестройка возможна только из собственного готового вагонного пансиона в том же районе.');
  if(redevelopId&&projectId==='wagonboarding')reasons.push('Нельзя заменить пансион таким же пансионом.');
  const player=state.players[playerId];
  const project=projectById(projectId);
  const district=districtById(districtId);
  const ds=state.districts?.[districtId] || (district?{landValue:district.landValue,sites:district.sites,roadAccess:district.road}:null);
  const access=districtAccess(state,districtId);
  if(state.phase!=='development') reasons.push('Строительство доступно только после тендеров.');
  if(!player||!project||!district||!ds) reasons.push('Недоступный игрок, проект или район.');
  if(player&&project&&!project.standard&&!player.portfolio.includes(projectId)) reasons.push('Проекта нет в доступном портфеле игрока.');
  if(project?.retired)reasons.push('Проект снят с рынка и недоступен для нового строительства.');
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
  else if(ds&&used-(replacing?1:0)>=ds.sites) reasons.push('В районе нет свободных строительных площадок.');
  if(project?.id==='wagonboarding'&&!project.wagonDistricts?.includes(districtId))reasons.push('Вагонный пансион строится только в западных районах.');
  if(project?.id==='sailorlodging'&&!LOGISTICS_NODES.some(n=>n.districtId===districtId&&n.kind.includes('port')))reasons.push('Для матросской ночлежки нужен действующий портовый узел погрузки.');
  if(project?.id==='workers_complex'&&!availableWorkforceTargets(state,playerId,districtId).length)reasons.push('Нужна собственная завершённая фабрика или завод в этом районе без другого рабочего корпуса.');
  const serviceFamily=serviceFamilyForProject(projectId);
  if(serviceFamily&&(state.constructions||[]).some(c=>c.districtId===districtId
    &&!['abandoned','redeveloped'].includes(c.status)&&STANDARD_SERVICE_FAMILIES[serviceFamily].includes(c.projectId)))
    reasons.push('В районе уже строится или действует учреждение этой службы (стандартное либо рыночное).');
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
  const bureauDiscount=!replacing&&player&&ds&&(player.bureauContracts||0)>0&&ds.landValue>0?Math.min(BUREAU_LAND_DISCOUNT,ds.landValue):0;
  const landCost=ds?(replacing?0:Math.max(0,ds.landValue-bureauDiscount)):0;
  if(player&&ds&&player.capital<landCost) reasons.push(`Не хватает капитала на землю ($${landCost}).`);
  return {
    ok:reasons.length===0,
    reasons,
    cost:landCost,
    baseCost:ds?.landValue??0,
    bureauDiscount,
    redevelopment:replacing,
    redeemedLumber:replacing?Math.min(former.wagonLevel||1,(project?.materials||[]).filter(x=>x==='Lumber').length,CONSTRUCTION_STAGING_CAPACITY):0,
    landValue:ds?.landValue??0,
    access,
    usedSites:used,
    totalSites:ds?.sites??0,
    freeSites:Math.max(0,(ds?.sites??0)-used)
  };
}

export function beginConstruction(state,playerId,projectId,districtId,{redevelopId=null}={}){
  const check=constructionEligibility(state,playerId,projectId,districtId,{redevelopId});
  if(!check.ok)return {ok:false,...check};
  const player=state.players[playerId];
  const idx=player.portfolio.indexOf(projectId);
  if(idx<0&&!isStandardProject(projectId))return {ok:false,reasons:['Проект уже недоступен.']};
  const consumed=consumeMainAction(state,playerId,districtId);
  if(!consumed.ok)return consumed;
  const former=check.redevelopment?state.constructions.find(c=>c.id===redevelopId):null;
  if(former){former.status='redeveloped';former.redevelopedRound=state.round;former.redevelopedInto=state.nextConstructionId||1;}
  const construction={
    id:`C${state.nextConstructionId||1}`,
    playerId,projectId,districtId,
    startedRound:state.round,
    status:'under-construction',
    materialsDelivered:Array.from({length:check.redeemedLumber||0},()=> 'Lumber'),
    warehouseInventory:[],
    completedRound:null,
    ...(former?{redevelopedFrom:former.id,redeemedLumber:check.redeemedLumber}:{}),
    ...(projectId==='wagonboarding'?{wagonLevel:1,wagonUpgradedRound:null}:{})
  };
  state.nextConstructionId=(state.nextConstructionId||1)+1;
  if(!isStandardProject(projectId))player.portfolio.splice(idx,1);
  player.capital-=check.cost;
  if(check.bureauDiscount>0)player.bureauContracts=Math.max(0,(player.bureauContracts||0)-1);
  state.constructions=state.constructions||[];
  state.constructions.push(construction);
  state.pendingConstruction=null;
  state.selectedDistrictId=districtId;
  const discountText=check.bureauDiscount>0?` (Construction Contract −$${check.bureauDiscount})`:'';
  logEvent(state,`${player.name} ${former?'перестраивает пансион в':'начал строительство'} «${projectById(projectId).name}» в ${districtById(districtId).name}: земля $${check.cost}${discountText}${former?', повторно использовано Lumber ×'+check.redeemedLumber:''}.${workerMovementText(consumed)}`,'good');
  const completedImmediately=!!(former&&completeConstruction(state,construction).ok);
  return {ok:true,construction,cost:check.cost,bureauDiscount:check.bureauDiscount,worker:consumed.worker,redevelopment:!!former,redeemedLumber:check.redeemedLumber||0,completedImmediately};
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
    c.playerId===playerId&&c.districtId===districtId&&isWarehouseConstruction(c)&&c.status==='complete'
  ).length;
}

export function completedWarehouses(state,playerId,districtId=null){
  return (state.constructions||[]).filter(c=>
    c.playerId===playerId&&isWarehouseConstruction(c)&&c.status==='complete'
    &&(districtId==null||c.districtId===districtId)
  );
}


/** Industrial output is private stock at the finished building, not free warehouse
 * storage and not a global-market supply node. A new year fills missing places
 * up to capacity; unused output cannot accumulate past the per-building limit.
 */
export const INDUSTRIAL_PRODUCTION = Object.freeze({
  brickworks: Object.freeze({resource:'Masonry',capacity:2}),
  foundry: Object.freeze({resource:'Steel',capacity:1})
});
// A staffed night-shift complex increases both yearly output and private stock
// capacity. Without the larger stock, doubling production would silently vanish.
export function industrialProductionCapacity(state,construction){
  const production=INDUSTRIAL_PRODUCTION[construction?.projectId];
  if(!production)return 0;
  return production.capacity*(hasWorkforceComplex(state,construction)?2:1);
}
export function industrialInventory(construction){
  if(!construction||construction.status!=='complete'||!INDUSTRIAL_PRODUCTION[construction.projectId])return [];
  if(!Array.isArray(construction.industrialInventory))construction.industrialInventory=[];
  return construction.industrialInventory;
}
export function completedIndustrialProducers(state,playerId=null){
  return (state.constructions||[]).filter(c=>c.status==='complete'
    &&INDUSTRIAL_PRODUCTION[c.projectId]&&(playerId==null||c.playerId===playerId));
}
export function replenishIndustrialProduction(state){
  const results=[];
  for(const construction of completedIndustrialProducers(state)){
    const output=INDUSTRIAL_PRODUCTION[construction.projectId];
    const inventory=industrialInventory(construction);
    const missing=Math.max(0,industrialProductionCapacity(state,construction)-inventory.length);
    for(let i=0;i<missing;i++)inventory.push(output.resource);
    if(missing)results.push({constructionId:construction.id,resource:output.resource,added:missing,stock:inventory.length});
  }
  return results;
}
export function canneryIncomeBonus(state,construction){
  if(!construction||construction.status!=='complete'||construction.projectId!=='cannery')return 0;
  return Math.min(3,(state.constructions||[]).filter(c=>c.status==='complete'&&c.districtId===construction.districtId
    &&projectTypes(c.projectId).includes('Жилое')).length);
}

export function bakeryInventory(construction){
  if(!construction||construction.projectId!=='bakery'||construction.status!=='complete')return [];
  if(!Array.isArray(construction.bakeryInventory))construction.bakeryInventory=[];
  return construction.bakeryInventory;
}

export function bakeryFuelSources(state,playerId,bakeryId){
  const bakery=(state.constructions||[]).find(c=>c.id===bakeryId&&c.projectId==='bakery'&&c.status==='complete'&&c.playerId===playerId);
  if(!bakery)return [];
  return [{kind:'bakery',id:bakery.id,inventory:bakeryInventory(bakery)},
    ...completedWarehouses(state,playerId,bakery.districtId).map(w=>({kind:'warehouse',id:w.id,inventory:warehouseInventory(w)}))]
    .filter(source=>source.inventory.includes('Lumber'))
    .map(({kind,id})=>({kind,id}));
}

export function activateBakery(state,playerId,bakeryId,choice,source=null){
  if(!canUseFreeAction(state,playerId))return {ok:false,reason:'not-active-player'};
  const bakery=(state.constructions||[]).find(c=>c.id===bakeryId&&c.projectId==='bakery'&&c.status==='complete'&&c.playerId===playerId);
  if(!bakery)return {ok:false,reason:'bakery'};
  if(bakery.bakeryUsedRound===state.round)return {ok:false,reason:'already-used'};
  if(!['cash','vp'].includes(choice))return {ok:false,reason:'choice'};
  const sources=bakeryFuelSources(state,playerId,bakeryId);
  const selected=source==null?sources[0]:sources.find(s=>s.kind===source.kind&&s.id===source.id);
  if(!selected)return {ok:false,reason:'lumber'};
  const construction=(state.constructions||[]).find(c=>c.id===selected.id);
  const inventory=selected.kind==='bakery'?bakeryInventory(construction):warehouseInventory(construction);
  const pos=inventory.indexOf('Lumber');
  if(pos<0)return {ok:false,reason:'lumber'};
  inventory.splice(pos,1);
  bakery.bakeryUsedRound=state.round;
  const player=state.players[playerId];
  if(choice==='cash')player.capital+=7;else player.prestige=(player.prestige||0)+1;
  logEvent(state,`${player.name}: Пекарный сезон («${districtById(bakery.districtId).name}»), 1 Lumber из ${selected.kind==='bakery'?'пекарни':'склада'} → ${choice==='cash'?'$7':'+1 VP'}.`,'good');
  return {ok:true,playerId,choice,capital:choice==='cash'?7:0,prestige:choice==='vp'?1:0,source:selected};
}

export function warehouseInventory(construction){
  if(!construction||!isWarehouseConstruction(construction)||construction.status!=='complete')return [];
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
    warehouseCapacity:warehouses.reduce((sum,w)=>sum+warehouseStorageCapacity(w),0)
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
  // Count completed buildings BEFORE this project flips to complete. Pending
  // projects do not block cottages' "first completed" district bonus.
  const completedBefore=(state.constructions||[]).filter(c=>
    c!==construction&&c.status==='complete'&&c.districtId===construction.districtId);
  const completedInDistrictBefore=completedBefore.length;
  const categoriesBefore=new Set(completedBefore.flatMap(c=>projectTypes(c.projectId)));
  // School receives one bonus VP per completed home in own/adjacent district,
  // from ANY player, up to two; resolve on school completion only.
  const schoolHousingVp=project.id==='school'
    ?Math.min(2,(state.constructions||[]).filter(c=>c.status==='complete'
        &&(c.districtId===construction.districtId||districtNeighbors(construction.districtId).includes(c.districtId))
        &&projectTypes(c.projectId).includes('Жилое')).length)
    :0;
  construction.materialsDelivered=[...(project.materials||[])];
  construction.status='complete';
  construction.completedRound=state.round;
  if(project.id==='school')construction.schoolHousingVpAwarded=schoolHousingVp;
  if(project.id==='workers_complex'){
    state.pendingWorkforceLinks=state.pendingWorkforceLinks||[];
    const targets=availableWorkforceTargets(state,construction.playerId,construction.districtId,construction.id);
    if(targets.length===1){construction.linkedIndustryId=targets[0].id;
      logEvent(state,`Рабочий корпус сразу связан с «${projectById(targets[0].projectId).name}»: ×2 ежегодный доход и выпуск материалов.`,'accent');}
    else if(targets.length>1)state.pendingWorkforceLinks.push(construction.id);
  }
  if(isWarehouseConstruction(construction)&&!Array.isArray(construction.warehouseInventory))construction.warehouseInventory=[];
  if(project.id==='bakery'&&!Array.isArray(construction.bakeryInventory))construction.bakeryInventory=[];
  if(INDUSTRIAL_PRODUCTION[project.id]&&!Array.isArray(construction.industrialInventory))construction.industrialInventory=[];
  const player=state.players[construction.playerId];
  if(project.id==='orphanage'&&!construction.orphanageInfluenceAwarded){
    const movement=moveInfluence(state,construction.playerId,1);
    construction.orphanageInfluenceAwarded=true;
    logEvent(state,`${player.name}: Сиротский приют завершён — +1 шаг Политического влияния${movement.steps===0?' (шкала не позволила продвижение)':''}.`,'good');
  }
  const vp=(project.prestige||0)+schoolHousingVp;
  if(vp){
    player.prestige=(player.prestige||0)+vp;
    logEvent(state,`${player.name} завершил «${project.name}» в ${districtById(construction.districtId).name} и получает +${vp} Prestige VP.`,'good');
  }else{
    logEvent(state,`${player.name} завершил «${project.name}» в ${districtById(construction.districtId).name}.`,'good');
  }

  // The first completed building in a district can be suburban cottages.
  // Award once, on THIS project's completion; a rival's existing building
  // prevents the bonus just as the owner's existing building does.
  let cottageBonus=0;
  if(project.id==='cottages'&&completedInDistrictBefore===0){
    cottageBonus=2;
    player.capital+=cottageBonus;
    construction.cottageBonusAwarded=cottageBonus;
    logEvent(state,`${player.name}: первые коттеджи в ${districtById(construction.districtId).name} — +$2 за освоение территории.`,'good');
  }
  // Each already completed wholesale market rewards a newly represented
  // district category once per completing building, including hybrid buildings.
  const newCategories=projectTypes(project).filter(type=>!categoriesBefore.has(type));
  if(newCategories.length){
    for(const market of completedBefore.filter(c=>c.projectId==='wholesale_market')){
      const marketOwner=state.players[market.playerId];
      marketOwner.capital+=3;
      logEvent(state,`${marketOwner.name}: оптовый рынок +$3 — новая категория «${newCategories.join(' / ')}» в районе ${districtById(construction.districtId).name}.`,'good');
    }
  }
  if(schoolHousingVp){
    logEvent(state,`${player.name}: школа получает +${schoolHousingVp} VP за завершённое жильё рядом.`,'good');
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
  // Only a NEW completion of the owner's residential project can trigger
  // a local woodworking premium. Each completed woodworks pays at most once/year.
  if(projectTypes(construction.projectId).includes('Жилое')){
    for(const works of (state.constructions||[])){
      if(works.projectId!=='woodworks'||works.status!=='complete'||works.playerId!==construction.playerId
        ||works.woodworkingRewardRound===state.round)continue;
      const nearby=works.districtId===construction.districtId||districtNeighbors(works.districtId).includes(construction.districtId);
      if(!nearby)continue;
      works.woodworkingRewardRound=state.round;
      player.capital+=2;
      logEvent(state,`${player.name}: «${projectById(works.projectId).name}» выплатила +$2 за завершение жилья в ${districtById(construction.districtId).name}.`,'good');
    }
  }
  const riskAfter=districtRisk(state,construction.districtId);
  if(riskBefore&&riskAfter&&(riskBefore.earthquake.raw!==riskAfter.earthquake.raw||riskBefore.fire.raw!==riskAfter.fire.raw)){
    logEvent(state,`Риск ${districtById(construction.districtId).name}: У ${riskBefore.earthquake.raw}→${riskAfter.earthquake.raw} · П ${riskBefore.fire.raw}→${riskAfter.fire.raw}.`,'accent');
  }
  return {ok:true,prestige:vp,schoolHousingVp,cottageBonus,landChange,roadOpened,warehouseUse:check.warehouseUse||0};
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
  if(source.kind==='supplier'){
    const supplier=NEUTRAL_MATERIAL_SUPPLIERS.find(x=>x.id===source.id);
    if(!supplier)return null;
    const maxCapacity=Math.max(...DELIVERY_HAULERS.map(h=>h.capacity));
    return {kind:'supplier',id:supplier.id,name:supplier.name,districtId:supplier.districtId,
      inventory:Array.from({length:maxCapacity},()=>supplier.resource),
      resource:supplier.resource,unitPrice:supplier.unitPrice,unlimited:true};
  }
  if(source.kind==='industry'){
    const plant=(state.constructions||[]).find(c=>c.id===source.id
      &&c.status==='complete'&&INDUSTRIAL_PRODUCTION[c.projectId]);
    if(!plant)return null;
    const output=INDUSTRIAL_PRODUCTION[plant.projectId];
    return {kind:'industry',id:plant.id,name:projectById(plant.projectId).name+' · '+districtById(plant.districtId).name,
      districtId:plant.districtId,inventory:industrialInventory(plant),resource:output.resource,
      ownerId:plant.playerId,unitPrice:RESOURCE_PRICES[output.resource]};
  }
  if(source.kind==='warehouse'){
    const wh=(state.constructions||[]).find(c=>c.id===source.id&&c.playerId===playerId&&isWarehouseConstruction(c)&&c.status==='complete');
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

export function deliveryMaterialCost(state,source,cargo,playerId=null){
  if(source?.kind==='industry'){
    const plant=(state.constructions||[]).find(c=>c.id===source.id&&c.status==='complete'
      &&INDUSTRIAL_PRODUCTION[c.projectId]);
    if(!plant)return {gross:0,discount:0,cost:0,procurementUsed:0};
    const output=INDUSTRIAL_PRODUCTION[plant.projectId];
    const units=(cargo||[]).filter(type=>type===output.resource).length;
    const gross=units*RESOURCE_PRICES[output.resource];
    const buyingOwn=plant.playerId===playerId;
    // Own foundry Steel costs $1 instead of $2. Own brickworks Masonry
    // costs $1 singly or $1 for two in ONE pickup; never pay yourself a commission.
    const discount=buyingOwn&&(plant.projectId==='foundry'?units:
      plant.projectId==='brickworks'&&units===2?1:0);
    // Brickworks: $1 PER PURCHASE, even when the rival takes 2 Masonry at once.
    // Foundry: $1 per Steel. Neither payment applies to the plant's owner buying.
    const ownerPayment=buyingOwn?0:plant.projectId==='brickworks'?(units>0?1:0):units;
    return {gross,discount,cost:gross-discount,procurementUsed:0,
      ownerId:plant.playerId,ownerPayment};
  }
  if(source?.kind==='supplier'){
    const supplier=NEUTRAL_MATERIAL_SUPPLIERS.find(x=>x.id===source.id);
    if(!supplier)return {gross:0,discount:0,cost:0,procurementUsed:0};
    const gross=(cargo||[]).reduce((sum,type)=>sum+(type===supplier.resource?supplier.unitPrice:0),0);
    return {gross,discount:0,cost:gross,procurementUsed:0};
  }
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

// The original source remains the first visit at routeIndex 0. Additional
// records represent one new pickup from a source at a specific route stop.
export function deliveryPickups(plan){
  if(!plan)return [];
  return [{source:plan.source,routeIndex:0,cargo:plan.cargo||[]},...(Array.isArray(plan.pickups)?plan.pickups:[])];
}
export function deliveryAllCargo(plan){return deliveryPickups(plan).flatMap(p=>p.cargo||[]);}

export function deliveryPlanCost(state,plan){
  const hauler=DELIVERY_HAULERS.find(h=>h.id===plan?.haulerId);
  if(!hauler)return null;
  const route=plan.route||[];
  const pickups=deliveryPickups(plan).filter(p=>p?.cargo?.length);
  const costs=pickups.map(p=>deliveryMaterialCost({...state,procurementRemaining:0},p.source,p.cargo,plan.playerId));
  const materialGross=costs.reduce((n,c)=>n+c.gross,0);
  const industryDiscount=costs.reduce((n,c)=>n+(c.ownerId!=null?c.discount:0),0);
  const industrySales=costs.filter(c=>c.ownerId!=null&&c.ownerPayment>0)
    .map(c=>({ownerId:c.ownerId,amount:c.ownerPayment}));
  const procurementPrices=pickups.flatMap(p=>p.source?.kind==='node'?(p.cargo||[]).map(t=>RESOURCE_PRICES[t]||0):[]);
  const procurementUsed=Math.min(state.procurementRemaining||0,procurementPrices.length);
  const procurementDiscount=procurementPrices.sort((a,b)=>b-a).slice(0,procurementUsed).reduce((a,b)=>a+b,0);
  const materialCost=materialGross-procurementDiscount-industryDiscount;
  const loadingCost=Math.max(0,pickups.length-1)*DELIVERY_EXTRA_LOADING_COST;
  const routeCost=Math.max(0,route.length-1)*DELIVERY_EDGE_COST;
  const yardRentCost=freightYardRentCost(state,plan);
  return {materialGross,procurementDiscount,industryDiscount,industrySales,procurementUsed,materialCost,
    haulerCost:hauler.baseCost,routeCost,loadingCost,yardRentCost,
    total:materialCost+hauler.baseCost+routeCost+loadingCost+yardRentCost};
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
  if(target.kind==='warehouse'||target.kind==='bakery'){
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
  const hauler=DELIVERY_HAULERS.find(h=>h.id===plan.haulerId);
  if(!hauler)return {ok:false,reason:'hauler'};
  if(hauler.limited&&(state.haulersUsed||[]).includes(hauler.id))return {ok:false,reason:'hauler-used'};
  const pickups=deliveryPickups(plan);
  if(!Array.isArray(plan.cargo)||!plan.cargo.length)return {ok:false,reason:'cargo'};
  if(plan.pickups!==undefined&&!Array.isArray(plan.pickups))return {ok:false,reason:'pickups'};
  if(pickups.some(p=>!Array.isArray(p.cargo)||!p.cargo.length||!p.cargo.every(t=>t in RESOURCE_PRICES)))return {ok:false,reason:'pickup-cargo'};
  const firstSource=deliverySourceInfo(state,plan.playerId,plan.source);
  if(!firstSource)return {ok:false,reason:'source'};
  const route=Array.isArray(plan.route)?plan.route:[];
  if(!validateRoute(route,firstSource.districtId))return {ok:false,reason:'route'};
  const inventories=new Map(),sources=[],seenStops=new Set();
  for(const pickup of pickups){
    const src=deliverySourceInfo(state,plan.playerId,pickup.source);
    const idx=pickup.routeIndex;
    if(!src||!Number.isInteger(idx)||idx<0||idx>=route.length||route[idx]!==src.districtId)return {ok:false,reason:'pickup-route'};
    const key=src.kind+':'+src.id;
    const visitKey=key+':'+idx;
    if(seenStops.has(visitKey))return {ok:false,reason:'duplicate-pickup'};
    seenStops.add(visitKey);
    const previous=inventories.get(key)||[];
    const together=[...previous,...pickup.cargo];
    if(!src.unlimited&&!hasMaterials(src.inventory,together))return {ok:false,reason:'source-stock'};
    if(src.unlimited&&!pickup.cargo.every(type=>type===src.resource))return {ok:false,reason:'source-stock'};
    inventories.set(key,together);
    sources.push(src);
  }
  if(plan.drops!==undefined&&!Array.isArray(plan.drops))return {ok:false,reason:'drops'};
  const drops=plan.drops||[];
  if(!multisetEquals(deliveryAllCargo(plan),drops.flatMap(d=>d.materials||[])))return {ok:false,reason:'unassigned'};
  const dropsByStop=new Map(),constructionDraft=new Map(),warehouseDraft=new Map();
  let freightYardDraft=[...freightYardInventory(state,plan.playerId)];
  for(const drop of drops){
    if(!drop||!Array.isArray(drop.materials)||!drop.materials.length)continue;
    const districtId=targetDistrictId(state,drop);
    const idx=drop.routeIndex??route.indexOf(districtId);
    if(!districtId||!Number.isInteger(idx)||idx<0||idx>=route.length||route[idx]!==districtId)return {ok:false,reason:'target-route'};
    if(!dropsByStop.has(idx))dropsByStop.set(idx,[]);
    dropsByStop.get(idx).push(...drop.materials);
    if(drop.kind==='construction'){
      const con=(state.constructions||[]).find(c=>c.id===drop.id);
      if(!con||con.playerId!==plan.playerId||con.status!=='under-construction')return {ok:false,reason:'target'};
      const staged=[...(constructionDraft.get(con.id)||con.materialsDelivered||[]),...drop.materials];
      const recipe=projectById(con.projectId)?.materials||[];
      const required=materialCounts(recipe),counts=materialCounts(staged);
      if(Object.entries(counts).some(([t,n])=>n>(required[t]||0)))return {ok:false,reason:'target-material'};
      const completesProject=multisetEquals(staged,recipe);
      if(staged.length>CONSTRUCTION_STAGING_CAPACITY&&!completesProject)return {ok:false,reason:'target-capacity'};
      constructionDraft.set(con.id,staged);
    }else if(drop.kind==='bakery'){
      const bakery=(state.constructions||[]).find(c=>c.id===drop.id);
      if(!bakery||bakery.playerId!==plan.playerId||bakery.projectId!=='bakery'||bakery.status!=='complete')return {ok:false,reason:'target'};
      if(drop.materials.some(t=>t!=='Lumber'))return {ok:false,reason:'target-material'};
      const staged=[...(warehouseDraft.get('bakery:'+bakery.id)||bakeryInventory(bakery)),...drop.materials];
      if(staged.length>1)return {ok:false,reason:'target-capacity'};
      warehouseDraft.set('bakery:'+bakery.id,staged);
    }else if(drop.kind==='warehouse'){
      const wh=(state.constructions||[]).find(c=>c.id===drop.id);
      if(!wh||wh.playerId!==plan.playerId||!isWarehouseConstruction(wh)||wh.status!=='complete')return {ok:false,reason:'target'};
      if(pickups.some(p=>p.source.kind==='warehouse'&&p.source.id===wh.id))return {ok:false,reason:'same-warehouse'};
      const stored=[...(warehouseDraft.get(wh.id)||warehouseInventory(wh)),...drop.materials];
      if(stored.length>warehouseStorageCapacity(wh))return {ok:false,reason:'target-capacity'};
      warehouseDraft.set(wh.id,stored);
    }else if(drop.kind==='freight-yard'){
      if(drop.id!==FREIGHT_YARD.id||pickups.some(p=>p.source.kind==='freight-yard'))return {ok:false,reason:'same-freight-yard'};
      freightYardDraft.push(...drop.materials);
      if(freightYardDraft.length>FREIGHT_YARD.capacityPerPlayer)return {ok:false,reason:'target-capacity'};
    }else return {ok:false,reason:'target'};
  }
  // At each stop, unload existing cargo before loading more; this allows a full
  // wagon to replenish in the same district without exceeding its capacity.
  let onBoard=[];
  for(let idx=0;idx<route.length;idx++){
    if(idx===0){
      onBoard.push(...plan.cargo);
      if(onBoard.length>hauler.capacity)return {ok:false,reason:'capacity'};
    }
    const remaining=[];
    for(const type of dropsByStop.get(idx)||[]){
      const pos=onBoard.indexOf(type);
      if(pos>=0)onBoard.splice(pos,1);
      else remaining.push(type);
    }
    const extras=pickups.slice(1).filter(p=>p.routeIndex===idx).flatMap(p=>p.cargo);
    onBoard.push(...extras);
    if(onBoard.length>hauler.capacity)return {ok:false,reason:'capacity'};
    if(!removeMaterials(onBoard,remaining))return {ok:false,reason:'unload-before-pickup'};
  }
  if(onBoard.length)return {ok:false,reason:'unassigned'};
  const cost=deliveryPlanCost(state,plan);
  if(!cost)return {ok:false,reason:'cost'};
  if(player.capital<cost.total)return {ok:false,reason:'capital',cost};
  return {ok:true,cost,source:firstSource,sources,hauler};
}

export function executeDelivery(state,plan){
  const check=validateDeliveryPlan(state,plan);
  if(!check.ok)return check;
  const {source,hauler,cost}=check;
  const pickups=deliveryPickups(plan);
  for(const pickup of pickups){
    const src=deliverySourceInfo(state,plan.playerId,pickup.source);
    if(src.kind==='supplier')continue;
    const inv=src.kind==='node'?state.logisticsSupply[src.id]:
      src.kind==='warehouse'?warehouseInventory(state.constructions.find(c=>c.id===src.id)):
      src.kind==='industry'?industrialInventory(state.constructions.find(c=>c.id===src.id)):
        freightYardInventory(state,plan.playerId);
    removeMaterials(inv,pickup.cargo);
  }
  const player=state.players[plan.playerId];
  player.capital-=cost.total;
  // The owner receives a commission only when another player purchases
  // factory output, and only after the complete delivery passed validation.
  for(const sale of cost.industrySales||[]){
    state.players[sale.ownerId].capital+=sale.amount;
    logEvent(state,`${state.players[sale.ownerId].name}: продажа заводской продукции +${sale.amount}.`,'good');
  }
  if(hauler.limited){state.haulersUsed=state.haulersUsed||[];state.haulersUsed.push(hauler.id);}
  if(cost.procurementUsed)state.procurementRemaining=Math.max(0,(state.procurementRemaining||0)-cost.procurementUsed);
  const constructionIds=[];
  for(const drop of plan.drops||[]){
    if(drop.kind==='construction'){
      const con=state.constructions.find(c=>c.id===drop.id);
      con.materialsDelivered=con.materialsDelivered||[];
      con.materialsDelivered.push(...drop.materials);
      if(!constructionIds.includes(con.id))constructionIds.push(con.id);
    }else if(drop.kind==='bakery'){
      bakeryInventory(state.constructions.find(c=>c.id===drop.id)).push(...drop.materials);
    }else if(drop.kind==='warehouse'){
      warehouseInventory(state.constructions.find(c=>c.id===drop.id)).push(...drop.materials);
    }else if(drop.kind==='freight-yard'){
      freightYardInventory(state,plan.playerId).push(...drop.materials);
    }
  }
  const routeText=(plan.route||[]).map(id=>districtById(id)?.name||id).join(' → ');
  const pickupText=pickups.map(p=>deliverySourceInfo(state,plan.playerId,p.source)?.name||p.source.id).join(' + ');
  const dropText=(plan.drops||[]).map(d=>{
    const con=d.kind==='freight-yard'?null:state.constructions.find(c=>c.id===d.id);
    const districtName=d.kind==='freight-yard'?districtById(FREIGHT_YARD.districtId)?.name:districtById(con?.districtId)?.name;
    const dest=d.kind==='freight-yard'?FREIGHT_YARD.name:
      d.kind==='warehouse'?'Warehouse':d.kind==='bakery'?'Пекарня':'«'+(projectById(con?.projectId)?.name||'стройка')+'»';
    const count=materialCounts(d.materials);
    return dest+' ('+districtName+'): '+Object.entries(count).map(([t,n])=>materialNameRu(t)+' ×'+n).join(', ');
  }).join('; ');
  logEvent(state,`${player.name} выполняет Delivery: ${pickupText}; ${hauler.name}; маршрут ${routeText}; разгрузка: ${dropText}; закупка $${cost.materialCost} + перевозчик $${cost.haulerCost} + дорога $${cost.routeCost} + доп. погрузки $${cost.loadingCost} + аренда $${cost.yardRentCost} = $${cost.total}.`,'accent');
  // A real supply port loads freight; export-only Gas House Cove is not a trigger.
  const portDistricts=new Set(pickups.map(p=>p.source.kind==='node'?LOGISTICS_NODES.find(n=>n.id===p.source.id):null)
    .filter(n=>n?.kind.includes('port')).map(n=>n.districtId));
  state.pendingSailorRecruitments=state.pendingSailorRecruitments||[];
  for(const con of state.constructions||[]){
    if(con.projectId!=='sailorlodging'||con.status!=='complete'||!portDistricts.has(con.districtId)
      ||con.sailorRecruitmentRound===state.round||state.pendingSailorRecruitments.includes(con.id))continue;
    state.pendingSailorRecruitments.push(con.id);
    logEvent(state,`Матросская ночлежка ${districtById(con.districtId)?.name}: портовая погрузка завершена, владелец выбирает вид вербовки.`,'accent');
  }
  const completed=[];
  for(const id of constructionIds){
    const con=state.constructions.find(c=>c.id===id);
    if(completeConstruction(state,con).ok)completed.push(id);
  }
  return {ok:true,cost,completed,hauler,source};
}

export function currentSailorRecruitment(state){
  return (state.pendingSailorRecruitments||[]).map(id=>(state.constructions||[]).find(c=>c.id===id))
    .find(con=>con&&con.status==='complete'&&con.projectId==='sailorlodging'&&con.sailorRecruitmentRound!==state.round)||null;
}
export function resolveSailorRecruitment(state,constructionId,mode){
  const current=currentSailorRecruitment(state);
  if(!current||current.id!==constructionId||state.phase!=='development')return {ok:false,reason:'no-pending'};
  if(!['lawful','illegal'].includes(mode))return {ok:false,reason:'mode'};
  const owner=state.players[current.playerId];
  if(mode==='illegal'&&owner.influence<=0)return {ok:false,reason:'influence'};
  const gain=mode==='illegal'?6:2;
  const movement=mode==='illegal'?moveInfluence(state,owner.id,-1):null;
  owner.capital+=gain;
  current.sailorRecruitmentRound=state.round;
  state.pendingSailorRecruitments.shift();
  logEvent(state,`${owner.name} — ${mode==='illegal'?'незаконная вербовка':'законный найм'} в ${districtById(current.districtId).name}: +$${gain}${movement?', Влияние −1 шаг':''}.`,'accent');
  return {ok:true,playerId:owner.id,capital:gain,mode,influenceSteps:movement?.steps||0};
}

export function currentPressCampaign(state){
  return (state.pendingPressCampaigns||[]).map(id=>(state.constructions||[]).find(c=>c.id===id))
    .find(c=>c&&c.projectId==='press_tower'&&c.status==='complete'&&c.pressCampaignRound!==state.round)||null;
}
export function resolvePressCampaign(state,constructionId,choice){
  const c=currentPressCampaign(state);
  if(!c||c.id!==constructionId||state.phase!=='development'||!state.developmentComplete||state.newsLastResolvedRound!==state.round)return {ok:false,reason:'no-pending'};
  if(!['cash','influence'].includes(choice))return {ok:false,reason:'choice'};
  const player=state.players[c.playerId];
  if(choice==='influence'&&player.capital<2)return {ok:false,reason:'capital'};
  if(choice==='cash')player.capital+=2;
  else{player.capital-=2;moveInfluence(state,player.id,1);}
  c.pressCampaignRound=state.round;
  state.pendingPressCampaigns.shift();
  logEvent(state,`${player.name}: газетная кампания «${projectById(c.projectId).name}» — ${choice==='cash'?'+$2':'−$2, +1 Влияние'}.`,'accent');
  return {ok:true,choice,playerId:c.playerId};
}

export function buildingIncome(state,playerId){
  return (state.constructions||[]).filter(c=>c.playerId===playerId&&c.status==='complete')
    .reduce((sum,c)=>sum+(projectById(c.projectId)?.income||0)+canneryIncomeBonus(state,c)+(c.projectId==='wagonboarding'?Math.max(0,Math.min(WAGON_MAX_LEVEL,c.wagonLevel||1)-1):0)+workforceIncomeBonus(state,c),0);
}

export function grossRoundIncome(state,playerId){
  return BASE_ROUND_INCOME+buildingIncome(state,playerId);
}

export function roundIncome(state,playerId){
  return Math.max(0,grossRoundIncome(state,playerId)-loanInterest(state,playerId)-Math.max(0,state.players[playerId]?.fireIncomePenalty||0));
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
    const influenceMove=moveInfluence(state,owner.id,1);
    logEvent(state,`${owner.name} получает +1 Influence: другой игрок использовал его Bank. Позиция ${influenceMove.from}→${influenceMove.to}.`,'good');
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

// Sell any unstarted hand project through a completed commission house.

export function firehouseHasWorkshop(state,firehouseId){
  const house=(state.constructions||[]).find(c=>c.id===firehouseId&&c.projectId==='firehouse'&&c.status==='complete');
  if(!house)return false;
  const eligible=new Set([house.districtId,...districtNeighbors(house.districtId)]);
  return (state.constructions||[]).some(c=>c.projectId==='fireworkshop'&&c.status==='complete'&&eligible.has(c.districtId));
}
export function firehouseInspectionDistricts(state,firehouseId){
  const house=(state.constructions||[]).find(c=>c.id===firehouseId&&c.projectId==='firehouse'&&c.status==='complete');
  if(!house)return [];
  return firehouseHasWorkshop(state,firehouseId)
    ?[house.districtId,...districtNeighbors(house.districtId)].filter(id=>districtById(id)?.buildable!==false)
    :[house.districtId];
}
export function firehouseUpgradeCandidates(state,playerId,firehouseId){
  const house=(state.constructions||[]).find(c=>c.id===firehouseId&&c.projectId==='firehouse'&&c.status==='complete');
  if(!house)return [];
  return (state.constructions||[]).filter(c=>c.status==='complete'&&c.districtId===house.districtId
    &&c.playerId===playerId&&!c.fireSafetyModernized&&constructionFireRisk(c)>0);
}
export function firehouseInspectionTargets(state,firehouseId,districtId){
  if(!firehouseInspectionDistricts(state,firehouseId).includes(districtId))return [];
  const candidates=(state.constructions||[]).filter(c=>c.status==='complete'&&c.districtId===districtId
    &&!c.fireSafetyModernized&&constructionFireRisk(c)>=2);
  const max=Math.max(0,...candidates.map(constructionFireRisk));
  return max>=2?candidates.filter(c=>constructionFireRisk(c)===max):[];
}
// Main worker action; firehouse is a public action space, one use per year.
// Every tied worst offender is upgraded, including the inspecting player's.
// For a shortfall, take all cash then apply one permanent −$1 annual income
// penalty per owner for this inspection, not per tied building.
export function useFirehouseAction(state,playerId,firehouseId,kind,targetId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const house=(state.constructions||[]).find(c=>c.id===firehouseId&&c.projectId==='firehouse'&&c.status==='complete');
  if(!house)return {ok:false,reason:'no-firehouse'};
  if(!workerCanReachDistrict(state,playerId,house.districtId))return {ok:false,reason:'worker-range'};
  if(actionSpaceOccupant(state,firehouseId)!=null)return {ok:false,reason:'occupied'};
  if(kind!=='upgrade'&&kind!=='inspect')return {ok:false,reason:'action'};
  let targets,fee=0,districtId=house.districtId;
  if(kind==='upgrade'){
    targets=firehouseUpgradeCandidates(state,playerId,firehouseId).filter(c=>c.id===targetId);
    if(targets.length!==1)return {ok:false,reason:'no-upgrade-target'};
    fee=firehouseHasWorkshop(state,firehouseId)?1:2;
    if(state.players[playerId].capital<fee)return {ok:false,reason:'capital'};
  }else{
    districtId=targetId;
    if(!firehouseInspectionDistricts(state,firehouseId).includes(districtId))return {ok:false,reason:'district'};
    targets=firehouseInspectionTargets(state,firehouseId,districtId);
    if(!targets.length)return {ok:false,reason:'no-violations'};
  }
  const consumed=consumeMainAction(state,playerId,house.districtId);
  if(!consumed.ok)return consumed;
  const fireBefore=districtRisk(state,districtId)?.fire.raw;
  const impacts=[];
  if(kind==='upgrade'){
    const target=targets[0];
    state.players[playerId].capital-=fee;
    target.fireSafetyModernized=true;
    impacts.push({playerId,cost:fee,paid:fee,incomePenalty:0,influenceDelta:0,constructionIds:[target.id]});
  }else{
    const owners=[...new Set(targets.map(c=>c.playerId))];
    for(const pid of owners){
      const owner=state.players[pid],owned=targets.filter(c=>c.playerId===pid);
      const due=owned.length*3;
      const paid=Math.min(owner.capital,due);
      owner.capital-=paid;
      const shortfall=paid<due;
      if(shortfall)owner.fireIncomePenalty=Math.max(0,owner.fireIncomePenalty||0)+1;
      const influence=moveInfluence(state,pid,-1);
      impacts.push({playerId:pid,cost:due,paid,incomePenalty:shortfall?1:0,
        influenceDelta:influence.steps,constructionIds:owned.map(c=>c.id)});
    }
    for(const c of targets)c.fireSafetyModernized=true;
  }
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[firehouseId]=playerId;
  const fireAfter=districtRisk(state,districtId)?.fire.raw;
  const label=districtById(districtId)?.name||districtId;
  logEvent(state,kind==='upgrade'
    ?`${state.players[playerId].name}: добровольная пожарная модернизация «${projectById(targets[0].projectId).name}» в ${label} за $${fee}; П ${fireBefore}→${fireAfter}.`
    :`${state.players[playerId].name}: пожарная инспекция в ${label}: модернизировано ${targets.length} зданий, П ${fireBefore}→${fireAfter}; штрафы и влияние владельцев пересчитаны.`,'accent');
  return {ok:true,kind,districtId,targets:targets.map(c=>c.id),impacts,fireBefore,fireAfter,worker:consumed.worker};
}

export function useCommissionHouse(state,playerId,houseConstructionId,handIndex){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const house=(state.constructions||[]).find(c=>c.id===houseConstructionId&&c.projectId==='commission_house'&&c.status==='complete');
  if(!house)return {ok:false,reason:'no-house'};
  if(!workerCanReachDistrict(state,playerId,house.districtId))return {ok:false,reason:'worker-range',districtId:house.districtId};
  if(actionSpaceOccupant(state,houseConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  if(!Number.isInteger(handIndex)||handIndex<0||handIndex>=player.portfolio.length)return {ok:false,reason:'no-project'};
  const id=player.portfolio[handIndex];
  const consumed=consumeMainAction(state,playerId,house.districtId);
  if(!consumed.ok)return consumed;
  player.portfolio.splice(handIndex,1);
  player.capital+=4;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[houseConstructionId]=playerId;
  state.expired=state.expired||[];
  state.expired.push({uid:`COMMISSION-${state.round}-${houseConstructionId}-${state.expired.length+1}`,id});
  logEvent(state,`${player.name} перепродал «${projectById(id)?.name||id}» через Комиссионный торговый дом за $4.${workerMovementText(consumed)}`,'good');
  return {ok:true,projectId:id,amount:4,worker:consumed.worker};
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
  const influenceMove=moveInfluence(state,playerId,1);
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[clubConstructionId]=playerId;
  if(club.playerId!==playerId){
    logEvent(state,`${player.name} ужинает и заводит связи в клубе игрока ${owner.name}: −$1, +1 Influence (${influenceMove.from}→${influenceMove.to}); $1 получает владелец заведения.${workerMovementText(consumed)}`,'accent');
  }else{
    logEvent(state,`${player.name} тратит $1 на ужин и приём состоятельных горожан в своём клубе: +1 Influence (${influenceMove.from}→${influenceMove.to}).${workerMovementText(consumed)}`,'accent');
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

function finishYearTransition(state,{rng=Math.random}={}){
  const survivors=(state.market||[]).filter(Boolean);
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
  const produced=replenishIndustrialProduction(state);
  for(const item of produced){
    const plant=state.constructions.find(c=>c.id===item.constructionId);
    logEvent(state,`${projectById(plant.projectId).name} (${districtById(plant.districtId).name}): произведено ${item.resource} ×${item.added}, запас ${item.stock}/${industrialProductionCapacity(state,plant)}.`,'good');
  }
  state.haulersUsed=[];
  reportCompletedCityGoals(state);
  setYearTurnOrderFromInfluence(state);
  state.players.forEach(p=>{
    p.workers=p.workers?.length?p.workers:createWorkers(p.id);
    // A jailed worker must stay jailed on Y+1; restore only at the start of Y+2.
    p.workers.forEach(w=>{w.used=false;});
    restoreExpiredJailedWorkerSlots(state,p.id);
  });
  state.developmentPlayer=null;state.developmentComplete=false;state.developmentSlotsUsed=state.players.map(()=>0);state.activationMainActionUsed=false;state.activeWorkerId=null;state.pendingWorkerAction=null;
  state.procurementRemaining=0;state.procurementSource=null;
  state.actionSpaceOccupancy={};
  state.bankOwnerRewarded={};state.bureauOwnerRewarded={};
  state.phase='declare';state.view='hall';state.declarationIndex=0;state.bidQueue=[];state.bidCursor=0;state.goalSessionClaims=[];
  state.market.forEach(m=>{if(m){m.claims=[];m.bids={};m.result=null;m.sold=false;}});
  state.yearTransition=null;
  const first=state.market.find(Boolean);
  state.selectedMarketUid=first?.uid||null;
  state.selectedProjectId=first?.id||null;
  const order=turnOrder(state).map(pid=>state.players[pid].name).join(' → ');
  logEvent(state,`Раунд ${state.round}. Порядок по Influence: ${order}. Старые проекты сдвинуты вправо и стоят на $1 дешевле.`,'accent');
  logEvent(state,'Поставки в портах и на станциях полностью обновлены: Lumber 40% · Masonry 35% · Steel 25%.','accent');
  return {ok:true,finished:false};
}

function advanceConstructionUpkeep(state,{rng=Math.random}={}){
  const transition=state.yearTransition;
  if(!transition)return {ok:false,reason:'no-transition'};
  const order=transition.playerOrder||state.players.map(p=>p.id);
  for(let i=transition.cursor||0;i<order.length;i++){
    const pid=order[i],player=state.players[pid];
    const due=constructionUpkeepDue(state,pid);
    transition.cursor=i;
    transition.playerId=pid;
    transition.due=due;
    if(due<=0){transition.cursor=i+1;continue;}
    if(player.capital>=due){
      player.capital-=due;
      logEvent(state,`${player.name} платит $${due} за простой ${unfinishedConstructions(state,pid).length} незавершённых строек.`,'bad');
      transition.cursor=i+1;continue;
    }
    state.phase='upkeep';
    return {ok:false,reason:'upkeep-choice',playerId:pid,due,capital:player.capital,
      constructionIds:unfinishedConstructions(state,pid).map(c=>c.id)};
  }
  return finishYearTransition(state,{rng});
}

export function closeConstructionForUpkeep(state,playerId,constructionId,{rng=Math.random}={}){
  if(state.phase!=='upkeep'||!state.yearTransition)return {ok:false,reason:'wrong-phase'};
  if(state.yearTransition.playerId!==playerId)return {ok:false,reason:'wrong-player'};
  const construction=(state.constructions||[]).find(c=>c.id===constructionId&&c.playerId===playerId&&c.status==='under-construction');
  if(!construction)return {ok:false,reason:'invalid-construction'};
  const lost=[...(construction.materialsDelivered||[])];
  construction.status='abandoned';
  construction.closedRound=state.round+1;
  construction.closedReason='upkeep';
  construction.lostMaterials=lost;
  construction.materialsDelivered=[];
  construction.warehouseInventory=[];
  const player=state.players[playerId],project=projectById(construction.projectId),district=districtById(construction.districtId);
  logEvent(state,`${player.name} закрывает незавершённый объект «${project?.name||construction.projectId}» в ${district?.name||construction.districtId}: не хватает денег на простой; потеряно материалов ${lost.length}.`,'bad');
  return advanceConstructionUpkeep(state,{rng});
}

export function cleanupMarket(state,{rng=Math.random}={}){
  if(state.phase==='upkeep'&&state.yearTransition){
    return {ok:false,reason:'upkeep-choice',playerId:state.yearTransition.playerId,
      due:constructionUpkeepDue(state,state.yearTransition.playerId),
      capital:state.players[state.yearTransition.playerId]?.capital||0,
      constructionIds:unfinishedConstructions(state,state.yearTransition.playerId).map(c=>c.id)};
  }
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if((state.pendingSailorRecruitments||[]).length||(state.pendingWorkforceLinks||[]).length)return {ok:false,reason:'pending-building-choice'};
  if((state.pendingPressCampaigns||[]).length)return {ok:false,reason:'pending-press-campaign'};
  if(!state.developmentComplete)return {ok:false,reason:'development-not-complete'};
  ensureNewspaper(state,{rng});
  resolveNewspaper(state);
  if(state.pressCampaignQueuedRound!==state.round){
    state.pressCampaignQueuedRound=state.round;
    state.pendingPressCampaigns=(state.constructions||[]).filter(c=>c.status==='complete'&&c.projectId==='press_tower'
      &&c.pressCampaignRound!==state.round).map(c=>c.id);
  }
  if(state.pendingPressCampaigns.length)return {ok:false,reason:'pending-press-campaign'};
  const remaining=state.market.filter(m=>m&&!m.sold);
  const old=remaining.filter(m=>m.age===1);
  old.forEach(m=>{state.expired.push({uid:m.uid,id:m.id});logEvent(state,`«${projectById(m.id).name}» сгорел: последний шанс истёк.`,'bad');});
  const fresh=remaining.filter(m=>m.age===0);
  const survivors=fresh.slice(0,2);
  fresh.slice(2).forEach(m=>{state.expired.push({uid:m.uid,id:m.id});logEvent(state,`«${projectById(m.id).name}» сброшен с правого края рынка.`,'bad');});
  survivors.forEach(m=>{m.age=1;m.discount=1;m.claims=[];m.bids={};m.result=null;m.sold=false;});

  if(state.round>=MAX_ROUNDS){
    // Final City Hall report: 1905 completions still count before incomplete contracts are penalized.
    state.round=MAX_ROUNDS+1;
    reportCompletedCityGoals(state);
    failIncompleteCityGoals(state);
    state.round=MAX_ROUNDS;
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
    const penalty=Math.max(0,p.fireIncomePenalty||0);
    const amount=roundIncome(state,p.id);
    p.capital+=amount;
    (p.loans||[]).forEach(loan=>loan.interestPaid=true);
    const interestText=interest?` − $${interest} проценты`:'';
    const fireText=penalty?` − $${penalty} постоянные пожарные санкции`:'';
    logEvent(state,`${p.name} получает доход $${amount} ($${BASE_ROUND_INCOME} базовый + $${buildingIncome(state,p.id)} здания${interestText}${fireText}).`,'good');
  });

  state.market=[...survivors];
  state.yearTransition={stage:'upkeep',fromRound:state.round,cursor:0,playerId:null,due:0,playerOrder:turnOrder(state)};
  return advanceConstructionUpkeep(state,{rng});
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
  if(kind==='clinic'||kind==='police')return completedActionSpaces(state,kind).filter(c=>c.districtId===districtId||districtNeighbors(districtId).includes(c.districtId));
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
    let actual=0;
    if(key==='influence'){
      actual=moveInfluence(state,pid,amount).steps;
    }else{
      actual=amount<0?Math.max(-Math.max(0,p[key]||0),amount):amount;
      p[key]=Math.max(0,(p[key]||0)+actual);
    }
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
