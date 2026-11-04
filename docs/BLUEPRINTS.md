# Blueprint library

H2DC ships four optional automation blueprints under `blueprints/automation/h2dc/`. They contain no household entity IDs and require the operator to select every target.

## Kiosk wake on presence

Select one or more motion or occupancy sensors and the installation-specific Fully Kiosk wake action. This separates dashboard presentation from Android wake behavior.

## Tablet PoE charging window

Select the tablet battery sensor and only the PoE switch that powers that tablet. The low and high thresholds create hysteresis so the port cannot chatter around one battery value.

## Multi-sensor presence lighting

Select all motion or occupancy sources for a room. Any active sensor turns the chosen lights on; the blueprint turns them off only after every selected sensor remains clear for the configured delay.

## Safe sensor overlap migration

Select legacy and replacement sensor sets during a physical migration. Both remain authoritative during overlap. Remove the legacy selector only after the replacement has passed the observation window and rollback evidence has been recorded.

For the commissioned FP300 migration, keep the Samsung sensor in the living-room legacy set until the FP300 completes natural acceptance. After the Samsung device is physically moved to the stairwell, update its device area and stairwell automation selectors in one controlled cutover; never let a living-room sensor trigger stairwell lights.
