// Newspaper editorials are fictional in-game headlines, not historical quotes.
// Standalone data module; Phase I, Phase II and UI import it without cycles.
export const NEWS_CARDS=Object.freeze([
  {
    "id": "F01",
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_F01_V2.md",
      "title": "КТО ЗАПЛАТИТ ЗА ПОЖАРНУЮ ОПАСНОСТЬ?!",
      "eventType": "one-year-fire-safety-collective-levy-or-personal-violation",
      "duration": "current-year-only",
      "complaint": {
        "firstFilerOnly": true,
        "requiresMainWorkerAction": true,
        "district": "any-current-max-fire-risk",
        "maxDistrictTie": "filer-selects",
        "target": "other-player-completed-building-with-positive-personal-fire-contribution",
        "oneAccusationPerEvent": true,
        "mayReassignTarget": false,
        "workerMustBeInTargetDistrict": null
      },
      "endOfYearIfActivePersonalNotice": {
        "accusedOwnerOnly": true,
        "capitalDelta": -6,
        "influenceSteps": -1,
        "allOtherPlayersExempt": true
      },
      "endOfYearIfNoActiveNotice": {
        "appliesToEveryPlayer": true,
        "capitalDeltaPerPlayer": -2,
        "influenceStepsPerPlayer": -1,
        "evenIfNoPlayersBuildingsInHighestRiskDistrict": true
      },
      "noticeCancelledOnlyIfAccusedBuildingFireContributionNonPositive": true,
      "districtWideFireRiskReductionDoesNotClearPersonalNotice": true,
      "noFireDestructionOrFirePropagation": true,
      "noImmediateRewardForFiler": true
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_F02_V2.md",
      "title": "ОН ПРЕДУПРЕДИЛ РЕДАКЦИЮ. ГОРОД В ОГНЕ!",
      "eventType": "one-year-arson-two-independent-operations",
      "fireStartsImmediatelyOnReveal": true,
      "locationDistrictIdsByD6": ["northbeach", "chinatown", "financial", "soma", "mission", "marina"],
      "stateMarkers": ["fire", "manhunt"],
      "operationsIndependent": true,
      "eitherOrderAllowed": true,
      "operations": {
        "suppressFire": {
          "requiresMainWorkerAction": true,
          "sourceProjectIds": ["std_fire", "firehouse"],
          "mayUseAnyPlayersCompletedService": true,
          "routeCostPerRoadEdge": 1,
          "reward": {"prestige": 2, "influence": 1},
          "removesMarker": "fire",
          "maxCompletions": 1
        },
        "catchArsonist": {
          "requiresMainWorkerAction": true,
          "sourceProjectIds": ["std_police", "police"],
          "mayUseAnyPlayersCompletedService": true,
          "routeCostPerRoadEdge": 1,
          "reward": {"prestige": 2, "influence": 1},
          "removesMarker": "manhunt",
          "maxCompletions": 1
        }
      },
      "endOfYear": {
        "ifFireMarkerRemains": {"allPlayersCapitalDelta": -3},
        "ifManhuntMarkerRemains": {"allPlayersInfluenceSteps": -1},
        "penaltiesIndependent": true,
        "duration": "current-year-only",
        "alwaysExpires": true
      },
      "noReserveMunicipalTeams": true,
      "noPassiveServiceResolution": true,
      "noBuildingDamageOrFireSpread": true
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_C01_V2.md",
      "raidReward": {"prestige": 2, "influence": 1}
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_H01_V2.md",
      "title": "Эпидемия охватывает городские кварталы",
      "originDistrictIdsByD6": ["chinatown", "northbeach", "missionbay", "potrero", "bernal", "innerrichmond"],
      "outbreakCount": 1,
      "initialRadius": 0,
      "annualRadiusGrowth": 1,
      "sanitationReward": {"prestige": 2, "influence": 1}
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_H02_V2.md",
      "title": "Зараза в городских конюшнях",
      "originDistrictIdsByD6": ["northbeach", "financial", "civic", "soma", "mission", "missionbay"],
      "outbreakCount": 1,
      "citywide": true,
      "roadEdgeCost": 2,
      "applicableRoadRoutes": ["cargo", "paid-special-operations"],
      "sanitationReward": {"prestige": 3, "influence": 1}
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_H03_V2.md",
      "title": "Заморские грузы задержаны",
      "eventTiming": "before-current-year-supply-refresh",
      "duration": "current-year-only",
      "seaLogisticsNodeIds": ["broadway", "pacificmail", "chinabasin", "unioniron"],
      "supplySlotsReductionPerNode": 1,
      "unaffectedRailNodeIds": ["southernpacific"],
      "resolutionAction": null,
      "reward": null
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_H04_V2.md",
      "title": "Врачи требуют спасти младенцев",
      "eventType": "temporary-one-year-charity",
      "donationCost": 10,
      "reward": {"prestige": 4, "influence": 2},
      "requiresWorkerAction": false,
      "maxDonationsPerPlayer": 1,
      "requiresMedicalBuilding": false,
      "duration": "current-year-only"
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_E01_V2.md",
      "title": "Работодатели ищут жильё для новых рабочих",
      "eventType": "one-year-limited-rental-contracts",
      "contractPool": 2,
      "maxContractsPerPlayer": 1,
      "trigger": "newly-completed-own-residential-building",
      "eligibleProjectTypesIncludes": "Жилое",
      "includesMixedTypeProjects": true,
      "constructionStartCanPrecedeEventYear": true,
      "rewardChoice": [
        {"capital": 6},
        {"prestige": 1, "influence": 1}
      ],
      "requiresExtraWorkerAction": false,
      "duration": "current-year-only"
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_E02_V2.md",
      "title": "Городская торговая неделя",
      "eventType": "one-year-trade-week",
      "duration": "current-year-only",
      "requiresMainWorkerAction": true,
      "maxEventsPerPlayer": 1,
      "eligibleProjectTypesIncludes": "Торговое",
      "includesMixedTypeProjects": true,
      "countOnlyCompletedBuildings": true,
      "venueMayBeOwnedByOtherPlayer": true,
      "venueMayBeReusedByOtherPlayers": true,
      "organizerRewards": [
        {"minCompletedTradeBuildings": 1, "maxCompletedTradeBuildings": 1, "capital": 4, "prestige": 1},
        {"minCompletedTradeBuildings": 2, "maxCompletedTradeBuildings": 2, "capital": 5, "prestige": 1},
        {"minCompletedTradeBuildings": 3, "capital": 6, "prestige": 1}
      ],
      "selectedVenueOwnerReward": {"influence": 1},
      "selectedVenueCanBeOwnedByOrganizer": true
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_E03_V2.md",
      "title": "Западные кварталы просят помощи",
      "eventType": "one-year-community-material-aid",
      "duration": "current-year-only",
      "contractDistrictIds": ["outerrichmond", "sunset"],
      "maxContractsPerPlayer": 1,
      "maxClaimsPerDistrict": 1,
      "materialsRequired": 2,
      "differentMaterialTypesRequired": true,
      "eligibleMaterialTypes": ["Lumber", "Masonry", "Steel"],
      "acceptNewDelivery": true,
      "acceptOwnCompletedWarehouseInventoryInSameDistrict": true,
      "acceptConstructionStaging": false,
      "removeDeliveredMaterials": true,
      "requiresExtraMainWorkerAction": false,
      "rewardEachDistrict": {"capital": 13, "prestige": 2, "influence": 1}
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_E04_V2.md",
      "title": "Забастовка на набережной",
      "eventType": "one-year-waterfront-strike",
      "duration": "current-year-only-or-until-resolved",
      "marineNodeIds": ["broadway", "pacificmail", "chinabasin", "unioniron"],
      "excludedRailNodeIds": ["southernpacific"],
      "marinePickupSurchargePerDelivery": 2,
      "marinePickupSurchargeChargedOncePerRoute": true,
      "resolution": {
        "requiresMainWorkerAction": true,
        "eligibleDistrictProperty": "port",
        "cashCost": 5,
        "reward": {"prestige": 3, "influence": 1},
        "resolutionScope": "entire-city",
        "maxResolutionsPerEvent": 1
      },
      "automaticEndAtYearClose": true
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_E05_V2.md",
      "title": "Город благодарит своих защитников",
      "eventType": "one-year-community-service-commemoration",
      "duration": "current-year-only",
      "eligibleDiscountedStandardProjects": ["std_clinic", "std_fire", "std_police"],
      "excludeStandardWarehouseFromDiscount": true,
      "freeLandCostForEligibleNewStandardProjects": true,
      "freeStandardProjectFeeForEligibleNewStandardProjects": true,
      "otherBuildingAndDeliveryCostsUnchanged": true,
      "discountAppliesOnConstructionStartDuringEvent": true,
      "endOfYearReward": {
        "countOnlyOwnerCompletedProjects": true,
        "eligibleProjectIds": ["std_clinic", "clinic", "std_fire", "firehouse", "std_police", "police"],
        "includeCompletedInPreviousYears": true,
        "includeCompletedThisYear": true,
        "influencePerCompletedService": 1,
        "maxServicesPerPlayer": null,
        "awardedOncePerEvent": true
      }
    },
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
    "designV2": {
      "status": "approved-for-playtest-data-only",
      "specification": "docs/NEWSPAPER_E06_V2.md",
      "title": "Деньги для безработных под угрозой",
      "headlineTheme": "гражданский фонд, общественные работы и скандал с поддельными зарплатными ведомостями",
      "eventType": "one-year-relief-fund-moral-choice",
      "duration": "current-year-only",
      "frequency": "oncePerPlayer",
      "requiresMainAction": true,
      "fundTrancheEntrustedPerParticipant": 8,
      "fundTrancheNotPlayerCapitalUntilMisappropriated": true,
      "mutuallyExclusiveChoices": {
        "honestReliefWork": {
          "personalCapitalCost": 6,
          "vp": 3,
          "influenceSteps": 2,
          "suspicionDelta": 0
        },
        "misappropriateFund": {
          "personalCapitalGain": 8,
          "vp": 0,
          "influenceSteps": -1,
          "suspicionDelta": 1,
          "useStandardCrimeArrestRules": true
        }
      },
      "noInsuranceOrFireRiskRequirements": true,
      "noMandatorySpecificDistrictOrBuildingApproved": true,
      "noOtherPlayerDependency": true
    },
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
