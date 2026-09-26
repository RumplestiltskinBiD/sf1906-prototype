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
