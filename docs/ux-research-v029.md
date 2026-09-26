# UX research for v0.29.0

Purpose: improve usability of the digital Phase I prototype without changing the underlying economy or rules.

## 30 digital board games used as usability references

1. Through the Ages — persistent status, warnings/reminders before the player loses an opportunity.
2. Root — strong faction/player-state separation and board-centric play.
3. Wingspan — clear card hierarchy; avoid scattering essential information across several screens.
4. Terraforming Mars — persistent resources and board state; avoid hiding public information behind modal navigation.
5. Dune: Imperium — clear worker-placement legality and current-turn focus.
6. Spirit Island — dense information works when grouped by decision context.
7. Scythe — legal destinations/actions should be highlighted directly on the map.
8. Gloomhaven — contextual action resolution instead of requiring constant rule recall.
9. Race for the Galaxy — fast access to opponent/public information.
10. Dominion — available actions/resources update immediately and remain visible.
11. Lords of Waterdeep — worker-placement spaces should clearly communicate availability/occupation.
12. Viticulture — compact player panels and action spaces tied closely to board position.
13. Everdell — useful visual board, but avoid finicky interaction and excessive drag/drop.
14. Istanbul — route/location state should remain readable while planning movement.
15. Raiders of the North Sea — action availability should be legible before clicking.
16. Concordia — public card/board information must not require repeated menu switching.
17. Castles of Burgundy — useful legal-move highlighting; avoid mobile UI clutter.
18. Agricola — avoid tiny hidden iconography for important constraints.
19. Carcassonne — possible placement areas should be explicit.
20. Ticket to Ride — persistent map focus is good; avoid animations/UI that obscure current state.
21. Splendor — excellent compact public-resource/status presentation.
22. Patchwork — decision-relevant economy and timeline stay in the same view.
23. Galaxy Trucker — contextual warnings make complex systems easier to operate.
24. Sagrada — strong pattern: show legal placement locations before commitment.
25. Jaipur — almost all information needed for a decision fits in one view.
26. Tokaido — simple persistent player progression and readable turn focus.
27. Aeon's End — clear separation of current player state and shared state.
28. Sentinels of the Multiverse — automation should expose what happened rather than hide resolution.
29. One Deck Dungeon — compact requirements/consequences adjacent to each choice.
30. Yellow & Yangtze — map interaction benefits from explicit legal placement feedback.

## 10 closer mechanical references / anti-pattern checks

1. Brass: Birmingham — network/resource logistics; useful shared-map focus, but avoid extra click chains for routine actions.
2. Le Havre — resource/logistics economy; avoid long scrolling lists of buildings/actions on mobile.
3. Agricola — worker placement + building constraints; requirements must not be tiny or icon-only.
4. Viticulture — worker placement + action buildings; show currently reachable/usable spaces clearly.
5. Lords of Waterdeep — worker placement + buildings that add actions; newly created action spaces need obvious affordances.
6. Raiders of the North Sea — worker/action interaction; board state should reveal what the worker can do now.
7. Everdell — worker placement + tableau; avoid dense decorative UI that reduces hit-target clarity.
8. Scythe — map movement/economy; use direct map highlighting rather than error-after-click.
9. Concordia — map network + cards; public information should remain one click or zero clicks away.
10. Terraforming Mars — project requirements + shared board; requirements must be visible before attempting placement.

## Patterns adopted for SF 1906

- Persistent information beats extra drawers for information needed every turn.
- Active-player information is primary, but opponent public information must remain quickly inspectable.
- A board click and an information-panel click should navigate to the same object.
- Legal actions/locations are shown proactively, not only rejected after a click.
- Green means usable now; red means reachable but illegal for the selected project; dim means outside the current worker's reach.
- Requirements sit next to project materials, before the player commits to construction.
- Temporary effects such as Procurement need a persistent reminder until consumed.
- Warehouse inventory belongs on the board and in the player overview because it directly changes construction possibilities.
- Mobile keeps the same information model, but uses a compact fixed strip and large touch targets rather than shrinking desktop panels.

## Patterns deliberately avoided

- Drag-and-drop as the only interaction.
- Important public information hidden behind multiple modal screens.
- Reducing all information to tiny icons.
- Showing every opponent detail permanently at once.
- Painting the entire map red/green when most districts are unreachable anyway.
- Large permanent overlays that cover workers, buildings, or logistics nodes.
- Changing rules/balance in the same build as a major usability pass.

Research inputs included official/BGA interface guidelines, Steam user feedback, and specialist digital-board-game reviews (Ars Technica, Meeple Mountain and similar sources). The research is directional UX evidence rather than a numerical ranking of the 40 games.
