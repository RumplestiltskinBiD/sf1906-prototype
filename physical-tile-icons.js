// Shared semantic icon registry. Approved artwork overrides legacy placeholders.
import {APPROVED_ARTWORK,drawApprovedArtwork} from './physical-tile-approved-icons.js';
export {RESOURCE_COLORS,TILE_INK} from './physical-tile-approved-icons.js';
// No game rules, project IDs, text parsing, remote fonts or external assets.
const icon=(id,group,label,description,paths)=>Object.freeze({id,group,label,description,paths:Object.freeze(paths)});
export const TILE_ICON_GROUPS=Object.freeze([
 {id:'materials',label:'Материалы и товары'},{id:'economy',label:'Экономика и очки'},
 {id:'risks',label:'Риски и защита'},{id:'actions',label:'Действия и ограничения'},
 {id:'types',label:'Типы зданий'}
].map(Object.freeze));
const legacyIcons=[
 icon('lumber','materials','Дерево','Строительный материал Lumber',['M3 7l12-4 6 4-12 4z M3 7v10l6 4V11 M9 21l12-4V7','M12 8l5-2 M5 12l2 2 M12 15l6-2 M12 18l4-1']),
 icon('masonry','materials','Кладка','Строительный материал Masonry',['M2 5h20v14H2z M2 12h20 M8 5v7 M16 5v7 M12 12v7']),
 icon('steel','materials','Сталь','Строительный материал Steel',['M4 3h16v4h-6v10h6v4H4v-4h6V7H4z']),
 icon('beer','materials','Пиво','Товар Beer; не строительный материал',['M4 7h12v14H4z M16 9h4v7h-4 M7 10v7 M11 10v7','M4 7a3 3 0 0 1 2-5 3 3 0 0 1 5 0 3 3 0 0 1 5 5']),
 icon('bread','materials','Хлеб','Товар Bread; не строительный материал',['M3 18V12a9 7 0 0 1 18 0v6z M8 8l2 4 M13 7l2 4 M18 9l1 3']),
 icon('contraband','materials','Контрабанда','Товар Contraband',['M3 5h18v14H3z M3 9h18 M9 9v10 M15 9v10','M10 3h4 M10 12l4 4 M14 12l-4 4']),
 icon('money','economy','Деньги','Разовая денежная сумма; знак и число задаются отдельно',['M12 2v20 M17 6h-7a4 4 0 0 0 0 8h4a3 3 0 0 1 0 6H7']),
 icon('bid','economy','Начальная ставка','Стартовая ставка open, не итоговая цена торгов',['M5 4l6 6 M9 2l5 5-4 4-5-5z M12 10l8 8-2 2-8-8 M3 20h9']),
 icon('income','economy','Доход','Регулярный Income; отдельно от разовой денежной выплаты',['M4 13a8 8 0 0 1 13-8l3 3 M20 2v6h-6 M20 11a8 8 0 0 1-13 8l-3-3 M4 22v-6h6','M12 7v10 M14 9h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-3']),
 icon('vp','economy','Победные очки','VP, не политическое влияние',['M6 3h12v6a6 6 0 0 1-12 0z M6 5H2v3a4 4 0 0 0 4 4 M18 5h4v3a4 4 0 0 1-4 4 M12 15v5 M7 21h10']),
 icon('influence','economy','Политическое влияние','Influence, отдельный игровой показатель',['M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z']),
 icon('land','economy','Стоимость земли','Стоимость земли района; не цена проекта',['M2 14l10-6 10 6-10 6z M2 14v4l10 4 10-4v-4 M12 2v9 M8 6l4-4 4 4']),
 icon('earthquake','risks','Землетрясение (У)','Показатель риска землетрясения; отрицательное значение сохраняется',['M2 14l5-4 4 3 3-8 3 9 5-3 M2 19h7l3-3 3 3h7 M4 8V3h6v5 M5 5h4']),
 icon('fire','risks','Пожар (П)','Показатель пожарного риска; знак задаётся отдельно',['M12 2c1 6-5 6-5 10 0 2 1 3 2 4-1-4 4-5 5-9 6 6 7 14-2 15C3 22 1 12 6 7c0 4 2 4 3 3']),
 icon('protection','risks','Защита','Обозначение защиты; область и тип указываются отдельно',['M12 2l9 4v7c0 4-5 7-9 9-4-2-9-5-9-9V6z M7 12l3 3 7-7']),
 icon('worker','actions','Представитель','Основное действие представителя; только при явном подтверждении правила',['M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M5 21l2-8h10l2 8z']),
 icon('quick','actions','Быстрое действие','Быстрое действие, не основное действие представителя',['M13 2L4 14h7l-1 8 10-13h-8z']),
 icon('capacity','actions','Вместимость','Количество мест; тип запаса или товара указывается отдельно',['M3 4h18v16H3z M3 12h18 M9 4v8 M15 12v8']),
 icon('year','actions','Конец года','Окончание игрового года, не отдельное действие',['M3 5h18v16H3z M3 9h18 M7 2v6 M17 2v6 M9 14l3-2v6 M10 18h4']),
 icon('once','actions','Однократно','Однократное срабатывание; момент указывается отдельно',['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M9 9l3-2v10 M9 17h6']),
 icon('completion','actions','При завершении','Эффект в момент завершения строительства',['M3 20V10l9-7 9 7v10H3z M8 14l3 3 6-6']),
 icon('condition','actions','Условие','Особое условие; точное содержание задаётся отдельно',['M12 2l10 10-10 10L2 12z M12 6v7 M12 17h.1']),
 icon('neighbor','actions','Радиус 1','Свой и соседние районы согласно графу; не буквальные шесть районов',['M2 4h8v8H2z M14 12h8v8h-8z M10 8h8v4 M14 16H6v-4']),
 icon('research','actions','Исследование','Научное исследование, не новое правило получения',['M8 2h8 M9 2v7L4 18a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4l-5-9V2 M7 15h10 M11 18h.1']),
 icon('housing','types','Жилое','Категория здания Жилое',['M2 11l10-8 10 8 M5 9v12h14V9 M10 21v-7h4v7']),
 icon('business','types','Бизнес','Категория здания Бизнес',['M3 7h18v14H3z M8 7V3h8v4 M3 13h18 M10 11h4v4h-4z']),
 icon('industry','types','Промышленное','Категория здания Промышленное',['M2 21V11l7-4v5l7-5v5h2V3h3v18z M6 16v2 M11 16v2 M16 16v2']),
 icon('public','types','Общественное','Категория здания Общественное',['M2 8l10-6 10 6z M4 21h16 M6 10v9 M12 10v9 M18 10v9']),
 icon('trade','types','Торговое','Категория здания Торговое',['M3 3h18l1 7H2z M4 10v11h16V10 M8 21v-7h8v7 M8 3l-1 7 M16 3l1 7']),
 icon('unknown','actions','Неизвестно','Нет зарегистрированного обозначения; не подменять другим ресурсом',['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M8 8a4 4 0 1 1 5 4l-1 2 M12 18h.1'])
];
const addedIcons=[["construction","actions","Строительство"],["project","actions","Проект"],["newspaper","actions","Газета"],["production","actions","Производство"],["delivery","actions","Доставка"],["movement","actions","Перемещение"],["disaster","risks","Катастрофа 1906"],["credit","economy","Кредит"],["goal","actions","Городская цель"],["warehouse","actions","Склад"],["partnership","actions","Партнёрство"],["inspection","actions","Инспекция"],["port","actions","Порт"],["rail","actions","Железная дорога"],["upgrade","actions","Модернизация"],["firehouse","risks","Пожарная служба"],["medical","risks","Медицина"],["police","risks","Полиция"],["suspicion","risks","Подозрение"],["material","materials","Любой строительный материал"]].map(([id,group,label])=>icon(id,group,label,id==='material'?'РС1 — рабочий кандидат, один строительный материал':label,[]));
const pathsOf=nodes=>nodes.flatMap(n=>[...(n.tag==='path'?[n.attrs.d]:[]),...pathsOf(n.children)]);
export const TILE_ICONS=Object.freeze([...legacyIcons,...addedIcons].map(def=>{
 const artwork=APPROVED_ARTWORK[def.id];
 return artwork?Object.freeze({...def,paths:Object.freeze(pathsOf(artwork.children)),artwork,designStatus:def.id==='material'?'candidate':'approved'}):Object.freeze({...def,designStatus:'legacy'});
}));
const registry=new Map(TILE_ICONS.map(i=>[i.id,i]));
export function tileIcon(id){return registry.get(id)??registry.get('unknown');}
const materialIds=Object.freeze({Lumber:'lumber',Masonry:'masonry',Steel:'steel',Beer:'beer',Bread:'bread',Contraband:'contraband'});
const categoryIds=Object.freeze({'Жилое':'housing','Бизнес':'business','Промышленное':'industry','Общественное':'public','Торговое':'trade'});
export function materialIconId(material){return Object.hasOwn(materialIds,material)?materialIds[material]:'unknown';}
export function categoryIconId(category){return Object.hasOwn(categoryIds,category)?categoryIds[category]:'unknown';}
const NS='http://www.w3.org/2000/svg';
const node=(doc,tag,attrs)=>{const n=doc.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
export function renderTileIcon(doc,id,{x=0,y=0,size=24,ink='#202b32',surface='#f0dfbd',value,label,decorative=false}={}){
 if(!Number.isFinite(size)||size<=0)throw Error('Invalid icon size');
 const def=tileIcon(id);
 const svg=node(doc,'svg',{x,y,width:size,height:size,viewBox:def.artwork?.viewBox??'0 0 24 24',class:'physical-icon','data-icon':def.id,
  ...(decorative?{'aria-hidden':'true'}:{role:'img','aria-label':label??def.label})});
 const title=node(doc,'title',{});title.textContent=label??def.label;svg.append(title);
 if(def.artwork){svg.append(drawApprovedArtwork(doc,def.artwork,{ink,surface,value}));return svg;}
 const group=node(doc,'g',{fill:'none',stroke:ink,'stroke-width':1.9,'stroke-linecap':'round','stroke-linejoin':'round'});
 for(const d of def.paths)group.append(node(doc,'path',{d}));svg.append(group);
 return svg;
}
