/**
 * SAN FRANCISCO 1906 — согласованные карты командировок / партнёрств, 2026-10-17.
 *
 * ТОЛЬКО ДАННЫЕ: никакие эффекты здесь не исполняются. Игровой движок
 * НЕ импортирует эти карты. Общие правила (черновые) — docs/card-rules-draft.md.
 * Для Wells Fargo численные параметры перевозчика предварительные до
 * утверждения одного универсального типа перевозчика.
 *
 * VP = победные очки.
 */
export const PARTNERSHIP_CARDS = Object.freeze([
  {
    id: 'T01',
    name: 'Саусалито — лесные поставки',
    status: 'approved-for-test',
    type: 'ferry-trip-and-partnership',
    oneOff: {
      text: 'Заполните до 3 свободных мест Lumber в любых общих портах и железнодорожных узлах города. Получите $4.',
      effect: {
        type: 'add-public-node-supply',
        resource: 'Lumber',
        maxUnits: 3,
        onlyFreeSupplySlots: true,
        destination: 'any-city-port-or-rail-node',
        playerReceivesMoney: 4,
        goesToPersonalStorage: false
      }
    },
    permanent: {
      requirementText: 'Минимум 1 завершённое промышленное здание.',
      text: 'Один раз в год без рабочего: заполните до 3 свободных мест Lumber в общих портах и железнодорожных узлах. Получите $1; поверните карту.',
      effect: {
        type: 'annual-public-node-lumber-supply',
        resource: 'Lumber',
        maxUnits: 3,
        onlyFreeSupplySlots: true,
        destination: 'any-city-port-or-rail-node',
        playerReceivesMoney: 1,
        requiresWorkerAction: false,
        frequency: 'once-per-game-year',
        rotateOnUse: true
      },
      requirement: { completedOwnedIndustrialProjectsAtLeast: 1 }
    },
    note: 'Это ПОСТАВКА ДРЕВЕСИНЫ НА ОБЩИЙ РЫНОК с получением денег игроком, а не покупка Lumber за $4/$1.'
  },
  {
    id: 'T02',
    name: 'Вальехо — заказ Mare Island Navy Yard',
    status: 'approved-for-test',
    type: 'ferry-trip-and-partnership',
    exportPoint: { name: 'Gas House Cove', districtId: 'marina', role: 'export-only' },
    oneOff: {
      text: 'Доставьте в Gas House Cove до 2 Steel; экспортируйте их по $8 за единицу.',
      effect: { type: 'steel-export', maxSteel: 2, moneyPerSteel: 8 }
    },
    permanent: {
      requirementText: 'Минимум 1 завершённое промышленное здание.',
      text: 'Раз в год без отдельного действия рабочего экспортируйте до 2 Steel через Gas House Cove по $7 за единицу; поверните карту.',
      effect: {
        type: 'annual-steel-export',
        maxSteel: 2,
        moneyPerSteel: 7,
        requiresWorkerActionForContractActivation: false,
        frequency: 'once-per-game-year',
        rotateOnUse: true
      },
      requirement: { completedOwnedIndustrialProjectsAtLeast: 1 }
    },
    logistics: {
      acceptedSteelSources: ['public-port', 'rail-node', 'own-warehouse'],
      normalDeliveryAndHaulerCostsApply: true,
      compatibleWithSameRunDeliveriesToOwnConstruction: true,
      steelRemovedFromGameOnExport: true,
      gasHouseCoveIsNotProcurementOrStorageNode: true
    }
  },
  {
    id: 'T03',
    name: 'Нью-Йорк — Восточный инвестиционный синдикат',
    status: 'approved-for-test',
    type: 'finance-trip-and-partnership',
    agreementEndYearExclusive: 1906,
    oneFinancialAgreementPerPlayerPerGame: true,
    oneOff: {
      text: 'Получите $8 минус $1 за каждый год после 1900. Ваш ежегодный доход −$1 до 1906 года; основная сумма не возвращается.',
      effect: {
        type: 'finance-agreement',
        amountInYear: { base: 8, subtractPerYearAfter1900: 1 },
        annualIncomeDeduction: 1,
        principalRepaymentRequired: false,
        persistsAfterPartnershipReplacement: true
      }
    },
    permanent: {
      requirementText: 'Минимум 2 завершённых собственных здания.',
      text: 'Получите $10 минус $1 за каждый год после 1900. Ваш ежегодный доход −$1 до 1906 года; основная сумма не возвращается.',
      effect: {
        type: 'finance-agreement',
        amountInYear: { base: 10, subtractPerYearAfter1900: 1 },
        annualIncomeDeduction: 1,
        principalRepaymentRequired: false,
        persistsAfterPartnershipReplacement: true
      },
      requirement: { completedOwnedBuildingsAtLeast: 2 }
    },
    note: 'Пример 1902: разовая $6, партнёрство $8. Удержание $1 на последующих годовых начислениях 1903, 1904, 1905; в 1905 новый договор разрешён.'
  },
  {
    id: 'T04',
    name: 'San Francisco Gas & Electric — электроснабжение районов',
    status: 'approved-for-test',
    type: 'electric-grid-trip-and-partnership',
    sharedRules: {
      requiresDeliveredResource: 'Lumber',
      deliveredUnits: 1,
      normalLogisticsRulesApply: true,
      targetMinCompletedBuildings: 3,
      countBuildingsOfAllPlayers: true,
      completedBuildingsOnly: true,
      allPlayersShareElectrifiedDistrictMarkers: true,
      maxElectrificationsPerDistrictPerGame: 1,
      markerPersistsAfterPartnerReplacement: true,
      markerOccupiesConstructionSlot: false,
      affectsWorkerMovement: false,
      changesLandValue: false
    },
    oneOff: {
      text: 'Доставьте 1 Lumber в район с минимум 3 завершёнными зданиями. Получите $2 за здание, максимум $6. Установите маркер электросети.',
      effect: {
        type: 'electrify-district-once',
        moneyPerCompletedBuilding: 2,
        maxMoney: 6
      }
    },
    permanent: {
      text: 'Не чаще одного раза в год доставьте 1 Lumber в район с минимум 3 завершёнными зданиями. Получите $2 за здание и установите маркер электросети.',
      effect: {
        type: 'annual-electrify-new-district',
        moneyPerCompletedBuilding: 2,
        maxMoney: null,
        frequency: 'once-per-game-year'
      }
    },
    note: 'Выплата только при новой электрификации района, НЕ повторяющийся доход со старых маркеров. Сумма постоянной сделки максимум $10 при текущих пяти слотах.'
  },
  {
    id: 'T05',
    name: 'American Bridge Company — стальные конструкции',
    status: 'approved-for-test',
    type: 'construction-contract-trip-and-partnership',
    oneOff: {
      text: 'Заключите контракт. После завершения одного НОВОГО здания, требующего минимум 2 Steel, получите $3 и +1 VP.',
      effect: {
        type: 'pending-construction-completion-reward',
        eligibleProjectMinSteel: 2,
        money: 3,
        vp: 1,
        trigger: 'after-new-eligible-building-completion',
        persistsUntilCompleted: true
      }
    },
    permanent: {
      text: 'Раз в год после завершения нового здания с Steel и суммарно минимум 4 материалами получите $2. Если проект требует минимум 2 Steel, дополнительно +1 VP.',
      effect: {
        type: 'annual-construction-completion-reward',
        eligibleProjectMinSteel: 1,
        eligibleProjectMinMaterialsTotal: 4,
        money: 2,
        bonusVpIfProjectSteelAtLeast: 2,
        bonusVp: 1,
        frequency: 'once-per-game-year'
      }
    },
    sharedRule: 'Одно завершение здания не может повторно исполнить один и тот же контракт. Материалы и логистика не меняются.'
  },
  {
    id: 'T06',
    name: 'Wells Fargo — экспресс-перевозки',
    status: 'approved-concept-carrier-numbers-provisional',
    type: 'transport-trip-and-partnership',
    oneOff: {
      text: 'Одна перевозка вместимостью 5 вместо стандартной; остальные правила и стоимость маршрута сохраняются.',
      effect: {
        type: 'one-off-special-carriage',
        capacity: 5,
        routeCostsUnchanged: true,
        bypassesRoadGraph: false,
        bypassesConstructionStaging: false
      }
    },
    permanent: {
      text: 'Раз в год одна перевозка вместимостью 5 по базовой стоимости $2; маршрут, загрузка и разгрузка по общим правилам.',
      effect: {
        type: 'annual-special-carriage',
        frequency: 'once-per-game-year',
        capacity: 5,
        baseCost: 2,
        routeCostsUnchangedBeyondBase: true,
        bypassesRoadGraph: false,
        bypassesConstructionStaging: false
      }
    },
    implementationOpenQuestion: 'Параметры должны быть сверены после перехода с разнотипных перевозчиков на одного универсального. Это не действующий в main тип перевозчика.'
  }
]);

export function partnershipCardById(id) {
  return PARTNERSHIP_CARDS.find(card => card.id === id) || null;
}
