# Logistics nodes — visual/history TODO

Status: marker placement/classification implemented in v0.28.7. Background rail artwork itself remains deferred.

## Locked gameplay affiliation

- Broadway Wharf -> North Beach
- Pacific Mail -> SoMa
- Southern Pacific · Third & Townsend -> SoMa
- China Basin / ATSF -> Mission Bay
- Union Iron Works / Potrero Point -> Potrero

No logistics node belongs to two gameplay districts.

## Visual/history corrections for the next map pass

### Southern Pacific · Third & Townsend
- Keep as a SoMa rail node.
- Move the marker slightly upward so the circle reads unambiguously as a SoMa node and does not overlap Mission Bay.
- Marker must sit on the historical rail alignment/tracks.

Historical note:
- Third & Townsend was Southern Pacific's San Francisco passenger/freight terminal in 1906.
- Rail identity is certain.

### Pacific Mail
- Move the marker to the waterfront edge so it clearly reads as a port/wharf.
- Re-check exact 1906 location before final placement.
- Do NOT remove the rail approach by default: historical evidence supports a direct railroad connection to the Pacific Mail wharf.
- Reconsider the current label “Pacific Mail / Pier 40”. For 1906, “Pacific Mail Wharf · First & Brannan” is likely safer/more period-correct than tying it to Pier 40.
- Consider changing visual type from port-only to rail-port if the final map shows the rail connection clearly.

Historical note:
- Pacific Mail's wharf facilities were at/near First & Brannan.
- A railroad connection between the Pacific Mail dock and railroad freight facilities existed historically.
- Sources also describe a coal yard/tramway at the Pacific Mail docks.

### China Basin / ATSF
- Keep gameplay district: Mission Bay.
- Keep conceptual type: rail-port.
- Move the marker toward the China Basin waterfront / car-ferry-slip area; current inland-looking placement is misleading.
- Draw/retain rail tracks into the ATSF yard and toward the waterfront slip.
- Consider a clearer label such as “ATSF China Basin · Rail Yard / Car Ferry”.

Historical note:
- ATSF developed China Basin as its San Francisco freight terminal in 1900-1906.
- It built a seawall, rail yard and a car-ferry slip at the northeast corner.
- Freight railcars were ferried across the Bay and sorted in the China Basin yard.
- By 1905 ATSF tracks spread through Mission Bay to industrial properties.

### Union Iron Works / Potrero Point
- Keep gameplay district: Potrero.
- Move the marker east toward the actual waterfront edge so the circle visibly touches/overlaps the bay edge and reads immediately as a port/shipyard.
- Keep it on the Potrero side of the gameplay boundary.
- Add/retain rail connection visually: Union Iron Works was connected by a Southern Pacific spur.
- Consider representing it as an industrial rail-port rather than generic industrial-port.

Historical note:
- Union Iron Works occupied deep-water frontage at Potrero Point.
- The shipyard was directly on San Francisco Bay and had a Southern Pacific rail spur.

## Safe conceptual decisions already supported by research

1. Third & Townsend remains SoMa and rail-only.
2. China Basin / ATSF is definitely rail + waterfront/car-ferry infrastructure; current rail-port gameplay concept is correct.
3. Pacific Mail should remain visibly waterfront-connected; historical evidence argues against deleting its rail connection.
4. Union Iron Works should read as both waterfront industry and rail-connected industry.
5. Do not let marker circles visually imply dual-district ownership.

## Sources consulted
- San Francisco Planning, Mission Rock Historic Resource Evaluation (China Basin / ATSF).
- Port of San Francisco / National Register documentation for Embarcadero rail-port infrastructure.
- San Francisco Planning / Central Waterfront historic context (Union Iron Works).
- San Francisco Museum 1906 Southern Pacific records (Third & Townsend).
- FoundSF / San Francisco Maritime historical material on Pacific Mail wharf and tramway.


## Implemented in v0.28.7

- Marker coordinates updated for all five logistics nodes.
- Third & Townsend moved upward and kept fully inside SoMa.
- Pacific Mail moved to the SoMa waterfront edge and classified as port + rail.
- China Basin moved toward the northeast waterfront/car-ferry side of Mission Bay and remains port + rail.
- Union Iron Works moved to the Potrero waterfront edge and classified as industrial port + rail.
- Broadway Wharf moved to the North Beach waterfront edge.
- Background railway artwork was not redrawn in this pass; exact rail-line artwork can be refined later if needed.
