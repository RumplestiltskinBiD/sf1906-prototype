# San Francisco 1906 — Board Game Prototype

Мобильный веб-прототип настольной игры про землетрясение и пожары в Сан-Франциско 1906 года.

## Prototype v0.27

Текущая версия проверяет основной игровой цикл:

1. развитие района South of Market;
2. строительство и укрепление зданий;
3. подготовку водопровода, газа и городских служб;
4. землетрясение;
5. пожары, спасение жителей, эвакуацию и ремонт инфраструктуры;
6. итоговый подсчёт очков.

Прототип рассчитан на Chrome на компьютере и телефоне. Состояние партии хранится локально в браузере.

После включения GitHub Pages игра будет доступна по адресу:
https://rumplestiltskinbid.github.io/sf1906-prototype/


## v0.25 movement layer

- Каждый игрок управляет 3 отдельными представителями.
- Все представители начинают в Civic Center.
- Для main action выбирается один неиспользованный представитель.
- Он может действовать в текущем или одном соседнем районе и после действия остаётся там.
- Raise Capital (+$3) служит безопасным fallback: его можно выполнить в текущем или соседнем районе, поэтому плохая позиция не запирает фигурку без полезного хода.
- Позиции сохраняются между раундами; в начале нового раунда сбрасывается только статус used.
- Действия Bank / Bureau / Shopping Row / Club и начало строительства требуют физической доступности выбранного представителя.
- Прежний Road access в интерфейсе называется Street Network: это развитая уличная сеть района, а не факт существования любой дороги.


## v0.25 mobile UX

- Все 3 представителя активного игрока одновременно видны на телефоне.
- Все 3 игрока одновременно видны в верхнем HUD; горизонтальная прокрутка для них не требуется.
- Основные Development actions на телефоне идут вертикальным списком, а не скрытой горизонтальной каруселью.
- Карта имеет FIT (весь город) и DETAIL (крупная карта с горизонтальным pan) режимы.
- Районы в радиусе одного шага выбранного представителя подсвечиваются до действия.


## v0.27 full map test

- В Phase I используются 18 строительных районов карты San Francisco 1900–1906.
- В каждом строительном районе ровно 5 building slots.
- Golden Gate Park — отдельная проходная зона: строить нельзя, представитель может войти и затем выйти в соседний район.
- Presidio и Twin Peaks закрыты и для строительства, и для перемещения.
- Движение представителей идёт только по явному графу соседства, совпадающему с границами районов тестовой карты.
- Земля сохраняет шкалу $0–$4: дорогие центральные/северо-восточные районы, средние центрально-западные, дешёвые южные/западные; Outer Sunset стартует с $0.
- Карта переведена в интерактивный SVG: районы кликабельны, legal destinations подсвечиваются, а workers/buildings рисуются поверх поля.
- Легенда оставлена на поле для тестирования ощущения физической настольной карты.


## v0.27 — V8 development map + logistics foundations

- The browser board now uses the approved **V8 development map with the manual red district contours** as the visual background.
- All 21 gameplay territories use the manually traced geometry as a transparent SVG interaction layer.
- The adjacency graph is locked to the current design, including geographic links for **Presidio** and **Twin Peaks** even though normal movement into them remains blocked.
- **Golden Gate Park** remains non-buildable but passable.
- Five logistics supply nodes are placed on the development map:
  - Broadway Wharf — North Beach — throughput 3
  - Pacific Mail / Pier 40 — SoMa — throughput 4
  - Southern Pacific · Third & Townsend — SoMa — throughput 4
  - China Basin / ATSF — Mission Bay — throughput 4
  - Union Iron Works / Potrero Point — Potrero — throughput 2
- At game start and after each round cleanup, every node receives a completely new random supply: **Lumber 40% / Masonry 35% / Steel 25%**. Any old node stock is discarded.
- The new logistics stock is **not yet connected to construction/payment**. The existing construction procurement flow is intentionally left intact until the delivery/hauler rules are designed and tested.


## v0.27.1 — map quality hotfix

- Replaced the aggressively compressed ~16 KB development-map payload with a dedicated high-quality 1536×1024 WebP asset (~491 KB, quality 95).
- The exact SVG gameplay geometry, adjacency, workers, buildings and logistics nodes are unchanged.
- Browser now loads `assets/v8-map.webp` directly instead of reconstructing a tiny image from text chunks.


## v0.27.2 — district overlay alignment hotfix

- Corrected the manual gameplay overlay by **11 px upward** to compensate for the PSD layer/page offset that had been carried into the SVG coordinates.
- The V8 raster background and logistics-node positions are unchanged.
- District hit areas, district metadata, construction tokens and worker tokens are shifted together so selected/hovered district borders align with the visible V8 boundaries.


## v0.28 — routed multi-drop Delivery

- Resource prices remain **Lumber $1 / Masonry $1 / Steel $2**.
- City supply nodes still refresh completely every round with **40% / 35% / 25%** random resources.
- Delivery is a repeatable **free action** during the active player's activation, before or after the main action.
- Six shared one-use haulers refresh each round:
  - capacity 2 / base $0 ×2
  - capacity 3 / base $1 ×2
  - capacity 4 / base $2 ×1
  - capacity 5 / base $3 ×1
- An unlimited **Standard Hauler** is always available: capacity 3 / base $3.
- Delivery cost = purchased materials + hauler base cost + **$1 per crossed district border**.
- One route may unload at multiple owned construction sites and Warehouses.
- Cargo may pass through ordinary gameplay districts only; **Golden Gate Park, Presidio and Twin Peaks are not valid freight-route districts**.
- Construction staging capacity is fixed at **3 resources**. Overflow rental and direct material buying were removed.
- Warehouse now costs **Lumber + Masonry + Steel**, stores **5 resources**, persists across rounds, can be a delivery source/destination, and can supply construction in its own district.
- Buildings needing 4+ resources therefore require a completed Warehouse in that district.
- Resources left in city ports/stations disappear at round refresh; materials already staged on construction or stored in Warehouses persist.


## v0.28.1 — Delivery UI hotfix

- Fixed three DOM selector crashes that prevented the v0.28 interface from completing its initial render.
- Extending a freight route no longer erases already assigned multi-drop unloads.
- Undoing the last route district now removes only unloads that are no longer on the route.
- Increased key Delivery touch targets on mobile.
- State schema remains v0.28, so existing local test saves are preserved.


## v0.28.2 — Delivery panel visibility fix

- Fixed Delivery panel visibility: starting the free action now explicitly opens the Delivery panel.
- After choosing a port/station or Warehouse, the visible panel advances to hauler + cargo selection.
- No game-state schema change; existing v0.28 saves remain compatible.


## v0.28.3 — same-district Delivery UX

- Same-district deliveries are explicitly supported in the UI: a construction in the source district can be unloaded without crossing a district border.
- When an unload target exists in the current district, Delivery shows a prominent “Разгрузить здесь” action before optional onward route choices.
- Clicking the current route district now explains that the truck is already there instead of incorrectly requiring a neighboring district.


## v0.28.4 — unload click hotfix

- Fixed a route-button selector regression introduced in v0.28.3.
- The first unload click no longer causes the Delivery panel re-render to crash.
- Resource assignment buttons (+L / +M / +S) remain wired after every Delivery re-render.
- Full app.js scan confirms there are no remaining querySelector(...).forEach selector mistakes.


## v0.28.5 — Delivery unload-first UX

- Delivery now presents valid unload targets immediately after the route strip.
- Optional “ЕХАТЬ ДАЛЬШЕ” controls appear only after unload choices, matching the natural player decision order.
- Removed the misleading “Разгрузить здесь” button that only scrolled rather than unloading.
- The current-district hint now checks whether a target can actually accept at least one remaining cargo resource.


## v0.28.6 — causal Delivery log

- Delivery is now logged before any construction completion it triggers.
- Every Delivery log entry records exact unload destinations and material quantities.
- Added regression coverage for Insurance Company built by two shipments: M+S from Pacific Mail, then M from Third & Townsend.


## v0.28.7 — specialized logistics nodes

- Each logistics node now has its own resource profile while weighted citywide supply remains approximately 40% Lumber / 35% Masonry / 25% Steel.
- Broadway Wharf is lumber-heavy; Union Iron Works is steel-heavy; other hubs use distinct mixed profiles.
- Historical marker positions were revised for all five logistics nodes.
- Pacific Mail is now shown as port + rail; Union Iron Works as industrial port + rail.
- Logistics UI is substantially Russianized while place names remain in English.


## v0.29.0 — usability HUD and map guidance

- Added a persistent player-object overview for unfinished construction and Warehouse inventories.
- Clicking a construction or Warehouse focuses its district on the map and opens object context.
- Top player HUD is sticky; clicking a player in City view switches object inspection to that player.
- Warehouses show compact D/K/S inventory directly on the map.
- Project cards surface construction requirements in a dedicated requirement band.
- During construction selection, reachable legal districts are green, reachable illegal districts are red, and unreachable districts are dimmed.
- Currently usable main/action-space actions are highlighted green, including Shopping Row Procurement.
- Active Procurement is surfaced persistently in the object overview.
- Added desktop and mobile E2E coverage for the new HUD and navigation.
- Phase I remains at 3 rounds in this build so the next playtest isolates UX changes from balance/duration changes.


## v0.29.1 — mobile map-first UX

- Moved the mobile construction/Warehouse overview from a bottom fixed panel into the top HUD row beside Help/Settings.
- Player pills once again always open that player's Office.
- Office now has an explicit “Показать объекты … на карте” action for opponent/active-player inspection.
- Mobile Delivery source selection is map-first: highlighted ports, rail nodes and stocked Warehouses are tapped directly on the map; the list is an optional fallback.
- Mobile route extension is map-first: legal neighboring districts are highlighted and tapped directly on the map; the list is optional.
- Enlarged invisible touch targets for logistics nodes and Warehouse sources without enlarging visible markers.
- Added a dedicated landscape-phone layout. Delivery docks to the right of the map, FIT mode uses vertical space, hidden context panels do not intercept taps, and route focusing centers targets in the unobstructed map area.
- Added portrait and landscape E2E coverage at 390x844, 844x390 and 932x430.


## v0.30A — District Risk Core

- Каждый строительный район получил открытые базовые значения **Earthquake (Q)** и **Fire (F)**.
- Риск хранится как **raw value без верхнего cap**; отображаемые уровни 0 / I / II / III являются качественной оболочкой. Значения выше III продолжают накапливаться, поэтому опасную застройку нельзя «спрятать» за потолком шкалы.
- Завершённые проекты детерминированно меняют Q / F района; незавершённые стройки пока не меняют текущий риск.
- Карты проектов показывают своё влияние на Q / F.
- Перед подтверждением новой стройки контекст района показывает **прогноз риска после завершения**.
- На карте добавлен компактный Q / F индикатор и отдельный режим **РИСК** для аналитического просмотра.
- Контекст района показывает источник каждого изменения риска.
- Исторические стартовые значения в этой версии являются **тестовыми балансировочными значениями** и не считаются окончательной исторической реконструкцией.
- Сам Disaster Simulator (Earthquake → Fire cascade → aftermath) остаётся задачей v0.30B.


### v0.30A QA follow-up

- Risk preview now uses the full signed safety/risk balance, so previously built safety is preserved when previewing later dangerous construction.
- The normal city layer stays cleaner; full Q/F comparison is emphasized in the dedicated **РИСК** view and district details.
- Added portrait and wide-landscape mobile QA for the Risk view and construction preview.


## v0.30A-UX — prototype usability pass

- Added a tester-first global **Undo** history (30 gameplay snapshots). UI-only navigation/inspection changes do not consume Undo steps.
- Added a compact mobile **Quick Action Dock** after representative selection, while keeping the full action catalogue available for explanations and secondary action spaces.
- Added a mobile **Market Overview** that compares all five projects by price, materials and Q/F change before opening full cards.
- Simplified the map toolbar to task controls only: Risk / Overview / Details; development diagnostics moved out of the map chrome.
- Increased the size of key mobile HUD/object-strip information instead of solving density with 6–8 px critical text.
- Landscape phone now exposes the same three-representative dock used in portrait.
- Stabilized Risk-panel landscape QA by waiting for the actual 180 ms slide-in transition before asserting viewport bounds.
- No balance or gameplay-rule changes are included in this pass.


## v0.30A-UX2 — Delivery UX 2.0

- Mobile Delivery now switches automatically to a compact route dock after cargo selection; the map remains the main interaction surface.
- Compact route dock shows route, unassigned cargo, live material / hauler / road cost and Confirm without occupying half the screen.
- Construction and Warehouse tokens that can accept the remaining cargo are highlighted directly on the map and can be tapped to open focused unloading controls.
- Route details are explicitly expandable/collapsible. Collapsing never cancels Delivery.
- Destructive cancellation is separated from collapse and is labelled **Отменить доставку / Отменить всю доставку** instead of using the close icon ambiguously.
- Secondary route actions live behind a compact menu; the neighbor list remains available as an accessibility/fallback path.
- Map centering reserves space for the compact route dock in portrait and landscape.
- No logistics prices, capacities, staging rules, Warehouse rules or balance values changed.


## v0.30A-UX3 — Mobile Turn Flow

- Mobile Delivery is now explicitly staged: source → hauler/cargo → route → confirm route → unload → confirm delivery.
- During route building the map is the primary workspace. Unload targets are not interactive until the route is confirmed.
- After route confirmation only eligible constructions / Warehouses along that fixed route are highlighted for unloading.
- The mobile turn dock is fixed above bottom navigation for the whole activation, including before worker selection and after the main action.
- Persistent dock exposes Delivery, access to other free actions, main-action navigation / End Activation, and a compact main-action status.
- The oversized disabled “use all representatives” button becomes a compact round progress indicator on mobile.
- No logistics prices, route costs, hauler capacities, staging limits, project balance or other gameplay values changed.


## v0.30A-UX3.1 — Construction Needs + Delivery Peek

- Mobile unfinished-construction chips now show remaining requirements such as `ОСТ: Д1 · К2` instead of zero-filled delivered inventory.
- Delivery hauler/cargo step shows every active construction, its district, progress and exact remaining material needs.
- Resource load buttons also show aggregate demand across the player's active constructions.
- During Delivery, unfinished construction tokens on the map show compact remaining-material badges.
- Opening Office, Log or Settings temporarily hides the Delivery overlay without cancelling or modifying the active Delivery draft; closing the drawer restores the exact previous Delivery state.
- No project requirements, logistics costs, capacities, staging limits or other gameplay values changed.
