/**
 * SAN FRANCISCO 1906 — утверждённые карты исследований (R01–R06), 2026-10-17.
 *
 * ТОЛЬКО ДАННЫЕ КАРТ: файл не подключён к игровому движку и ничего не меняет
 * в действующих сохранениях, балансе, интерфейсе или логике игры.
 * Все цены и награды ниже согласованы для первого игрового теста.
 * Технические нюансы: docs/card-rules-draft.md.
 *
 * VP = победные очки (в интерфейсе не использовать термин «престиж»).
 */
export const RESEARCH_CARDS = Object.freeze([
  {
    id: 'R01',
    name: 'Геологическое исследование Эндрю Лоусона',
    fundingCost: 3,
    sponsorReward: { vp: 2, influence: 1 },
    requirementText: 'Нет.',
    effectText: 'Однократно: стоимость земли в Marina, Financial District, SoMa, Mission и Mission Bay −1; в Pacific Heights и Chinatown +1.',
    effect: {
      type: 'land-revaluation-once',
      poorGroundDistricts: ['marina', 'financial', 'soma', 'mission', 'missionbay'],
      stableGroundDistricts: ['pacific', 'chinatown'],
      poorGroundDelta: -1,
      stableGroundDelta: 1,
      minLandValue: 0,
      maxLandValue: 6,
      appliesTo: 'current-land-value',
      existingLandPayments: 'no-retroactive-adjustment'
    }
  },
  {
    id: 'R02',
    name: 'Укреплённые конструкции',
    fundingCost: 4,
    sponsorReward: { vp: 3, influence: 1 },
    requirementText: 'Нет.',
    effectText: 'При строительстве здания с положительным приростом У можно дополнительно заплатить $2 и уменьшить прирост У этого здания на 1. Пожароопасность не меняется.',
    effect: {
      type: 'optional-building-earthquake-reinforcement',
      extraCost: 2,
      earthquakeDeltaReduction: 1,
      eligibleWhenProjectEarthquakeDeltaPositive: true,
      fireDeltaReduction: 0,
      repeatableForSameBuilding: false
    },
    implementationOpenQuestion: 'Точная точка оплаты в многоэтапной стройке — при начале или завершении — ещё не зафиксирована.'
  },
  {
    id: 'R03',
    name: 'Модернизация пожарного оборудования',
    fundingCost: 5,
    sponsorReward: { vp: 2, influence: 2 },
    requirementText: 'В городе завершены минимум 2 пожарных учреждения (посты или полноценные части, любого владельца).',
    effectText: 'Общегородская модернизация: действующие пожарные части снижают Пожароопасность своего района на 2 вместо 1. Радиус действия не расширяется.',
    requirement: { completedCitywide: { serviceFamily: 'firehouse', projectIds: ['firehouse','std_fire'], count: 2 } },
    effect: {
      type: 'citywide-firehouse-upgrade',
      fireProtectionInOwnDistrictBefore: 1,
      fireProtectionInOwnDistrictAfter: 2,
      extendsProtectionRadius: false,
      appliesToExistingAndFutureStations: true
    }
  },
  {
    id: 'R04',
    name: 'Городская санитарная программа',
    fundingCost: 4,
    sponsorReward: { vp: 2, influence: 1 },
    requirementText: 'В городе завершено минимум 1 медицинское учреждение (амбулатория или клиника, любого владельца).',
    effectText: 'Каждая завершённая клиника приносит владельцу дополнительно $1 ежегодно, если в её районе или соседнем районе есть хотя бы одно завершённое жилое здание.',
    requirement: { completedCitywide: { serviceFamily: 'clinic', projectIds: ['clinic','std_clinic'], count: 1 } },
    effect: {
      type: 'clinic-income-if-near-residential',
      annualIncomePerEligibleClinic: 1,
      maxIncomePerClinicPerYear: 1,
      residenceCanBelongToAnyPlayer: true,
      eligibleDistrictScope: 'own-or-adjacent',
      eligibleResidentialStatus: 'complete'
    },
    note: 'Существующая защита клиник от газетных событий «Болезнь» сохраняется; исследование её не дублирует.'
  },
  {
    id: 'R05',
    name: 'Телеграфная координация грузовых поставок',
    fundingCost: 4,
    sponsorReward: { vp: 3, influence: 1 },
    requirementText: 'Нет.',
    effectText: 'Все игроки заранее видят состав поставок материалов в снабженческие узлы на следующий игровой год.',
    effect: {
      type: 'reveal-next-year-logistics-supply',
      sharedInformation: true,
      mustPreGenerateAndPersistForecast: true,
      changesResourceQuantity: false,
      reservesResources: false
    },
    yearRestriction: null,
    note: 'Проведение в 1905 году разрешено: дополнительного запрета по годам нет.'
  },
  {
    id: 'R06',
    name: 'Муниципальное финансирование подрядов',
    fundingCost: 4,
    sponsorReward: { vp: 2, influence: 1 },
    requirementText: 'Нет.',
    effectText: 'При получении новой городской цели можно взять аванс $3 из денежной награды. При успехе выплата уменьшается на $3; при провале дополнительно −3 VP. Только одна активная цель с авансом на игрока.',
    effect: {
      type: 'city-goal-advance-option',
      advanceAmount: 3,
      grantTiming: 'when-taking-new-city-goal',
      onSuccessMoneyRewardReduction: 3,
      onFailureAdditionalVpPenalty: 3,
      maxActiveAdvancedGoalsPerPlayer: 1,
      extraWorkerActionRequiredForAdvance: false
    }
  }
]);

export function researchCardById(id) {
  return RESEARCH_CARDS.find(card => card.id === id) || null;
}
