// Newspaper editorials are fictional in-game headlines, not historical quotes.
// Standalone data module; Phase I, Phase II and UI import it without cycles.
export const NEWS_CARDS=Object.freeze([
  {
    "id": "F01",
    "category": "Пожар",
    "title": "Тесные дома, сухие лестницы",
    "article": "Жители обвиняют инспекторов в равнодушии к деревянным доходным домам. Если мэрия ничего не изменит, владельцы получат счета за ущерб от мелких возгораний.",
    "target": "housing",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "firehouse"
  },
  {
    "id": "F02",
    "category": "Пожар",
    "title": "Снова дым над торговыми улицами",
    "article": "Печи торговых заведений и небрежность владельцев раздражают жителей. Чиновники обещают проверки, а газета предупреждает о новых убытках.",
    "target": "commerce",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "firehouse"
  },
  {
    "id": "F03",
    "category": "Пожар",
    "title": "Горючие товары за деревянными дверями",
    "article": "В редакцию приходят письма о беспорядке на складах и фабриках. Когда вспыхнет очередной пожар, городская управа вновь заявит, что её никто не предупреждал.",
    "target": "industry-logistics",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "firehouse"
  },
  {
    "id": "F04",
    "category": "Пожар",
    "title": "Инспекторы предпочитают не видеть копоти",
    "article": "От перегретых мастерских до фабричных складов — горожане говорят о халатности. Пресса потребует назвать тех, кто допустил бездействие.",
    "target": "factory",
    "resource": "influence",
    "delta": -1,
    "frequency": "oncePerPlayer",
    "defense": "firehouse"
  },
  {
    "id": "C01",
    "category": "Преступность",
    "title": "Грабители хозяйничают на улицах города",
    "article": "Торговцы жалуются на кражи, пока полиция рапортует об успехах. К концу года предприниматели рискуют понести новые убытки.",
    "target": "shops-club",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "police"
  },
  {
    "id": "C02",
    "category": "Преступность",
    "title": "Исчезают целые партии товара",
    "article": "Докеры и управляющие складами теряют имущество, но расследования не дают результата. Газета спрашивает, куда уходят средства, выделенные на охрану.",
    "target": "warehouse-factory",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "police"
  },
  {
    "id": "C03",
    "category": "Преступность",
    "title": "Поддельные подписи в конторах",
    "article": "Из банков и страховых контор поступают жалобы на мошенничество. Если следователи не возьмутся за дело, предприниматели заплатят сами.",
    "target": "bank-insurance-hotel",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "police"
  },
  {
    "id": "C04",
    "category": "Преступность",
    "title": "Жители боятся возвращаться домой",
    "article": "О грабежах пишут целые кварталы, а городское начальство просит терпения. За отсутствие порядка ответят и владельцы доходных домов.",
    "target": "housing",
    "resource": "influence",
    "delta": -1,
    "frequency": "oncePerPlayer",
    "defense": "police"
  },
  {
    "id": "H01",
    "category": "Болезнь",
    "title": "Лихорадка в переполненных комнатах",
    "article": "Горожане жалуются на тесноту и недостаток врачей. Владельцы доходных домов должны приготовиться к санитарным расходам.",
    "target": "tenement-speculative",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "clinic"
  },
  {
    "id": "H02",
    "category": "Болезнь",
    "title": "Болезни среди постояльцев",
    "article": "Отели и клубы скрывают жалобы на здоровье посетителей. Без помощи врачей городу грозят расходы и недовольство публики.",
    "target": "hotel-club-shops",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "clinic"
  },
  {
    "id": "H03",
    "category": "Болезнь",
    "title": "Рабочие уходят с фабрик с жаром",
    "article": "Производство лихорадит из-за болезней и отсутствия медицинской помощи. Газета призывает инвесторов подумать не только о прибыли.",
    "target": "industry-logistics",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "clinic"
  },
  {
    "id": "H04",
    "category": "Болезнь",
    "title": "Кто отвечает за больных?",
    "article": "В редакцию поступают письма семей, которым отказали в помощи. Если врачи не найдутся, общество отвернётся от собственников.",
    "target": "housing",
    "resource": "prestige",
    "delta": -1,
    "frequency": "oncePerPlayer",
    "defense": "clinic"
  },
  {
    "id": "E01",
    "category": "Экономика",
    "title": "Новые семьи ищут квартиры",
    "article": "Население растёт, а квартир становится недостаточно. Владельцы жилья ожидают удачного сезона.",
    "target": "housing",
    "resource": "capital",
    "delta": 2,
    "frequency": "perDistrict",
    "defense": null
  },
  {
    "id": "E02",
    "category": "Экономика",
    "title": "Торговля на пике",
    "article": "Магазины, рестораны и гостиницы принимают всё больше посетителей. Городские купцы предсказывают прибыльный год.",
    "target": "shops-club-hotel",
    "resource": "capital",
    "delta": 2,
    "frequency": "perDistrict",
    "defense": null
  },
  {
    "id": "E03",
    "category": "Экономика",
    "title": "Грузы и новые заказы",
    "article": "Спрос на изделия фабрик растёт, а склады работают без передышки. Газета ожидает дополнительную прибыль для производителей.",
    "target": "industry-logistics",
    "resource": "capital",
    "delta": 2,
    "frequency": "perDistrict",
    "defense": null
  },
  {
    "id": "E04",
    "category": "Экономика",
    "title": "На пристанях очереди",
    "article": "Из-за нехватки рабочих доставка грузов замедляется. Чиновники спорят, пока фабрики и склады рискуют деньгами.",
    "target": "port-freight",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "emergency"
  },
  {
    "id": "E05",
    "category": "Общественная жизнь",
    "title": "Город признаёт заслуги служащих",
    "article": "Несмотря на недостатки администрации, многие благодарят врачей, пожарных и патрульных. Пресса призывает мэрию поддержать добросовестные службы.",
    "target": "service",
    "resource": "influence",
    "delta": 1,
    "frequency": "oncePerPlayer",
    "defense": null
  },
  {
    "id": "E06",
    "category": "Экономика",
    "title": "Страховщики требуют денег",
    "article": "Страховые конторы намерены поднять расценки для опасных кварталов. Успеют ли владельцы улучшить пожарную безопасность до конца года?",
    "target": "high-fire",
    "resource": "capital",
    "delta": -2,
    "frequency": "perDistrict",
    "defense": "emergency"
  }
]);
export const NEWS_CATEGORIES=Object.freeze({
  'Пожар':'Пожар','Преступность':'Преступность','Болезнь':'Болезнь',
  'Экономика':'Экономика','Общественная жизнь':'Общественная жизнь'
});
export function newsCard(id){return NEWS_CARDS.find(c=>c.id===id)||null;}
export function newsYear(round){return 1899+Math.max(1,Math.floor(Number(round)||1));}
