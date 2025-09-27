# Universal UI Test Bot - TODO Liste

## Status Badge & UI Verbesserungen
- [ ] Schönes Badge/Status-Anzeige hinzufügen für verschiedene Zustände (IDE läuft, Port verfügbar, etc.)
- [ ] Button um IDE zu starten , MODAL wäre hilfreich, da kann man dann vllt auswählen welchen Port welche IDE, vllt auch eine option um auszuwählen wo die Datei liegt, das starten wird via start_ide_example.bat .ps1 oder sh gemacht je nach dem welches OS 
- [ ] Wenn kein offener CDP Port gefunden wird, anstatt der Seite eine Meldung anzeigen: "IDE starten mit Port" ODER EINFACH MODAL öffnen blaa

## IDE Integration & Start
- [ ] Integration des start_cursor bash Scripts für IDE-Start
- [ ] Möglichkeit zur Auswahl anderer Executables/AppImages (nicht nur Cursor) mit konfigurierbarem Start-Script

## Task Management & Workflow
- [ ] Feature zum Sortieren aktueller Tasks - welche als nächstes sinnvoll wären
- [ ] Modal mit mehreren Auswahlmöglichkeiten für verschiedene Workflows/Was wir machen wollen

## Project Handling
- [ ] Logik für leere Projekte: Wenn keine Daten da sind, dann initial Modal starten, Auswahl App erstellung oder so aber improved mit prompts,
Wenn Project daten vorhanden, dann in pidea-output wahrscheinlich checken was da vorhanden ist, wir sollten also auch pidea-output ordentlich organisieren, das der agent da auch informationen reinschreibt was er schon gemacht hat, was der aktuelle stand ist etc. das aktuell halten  
- [ ] Überlegung: Sollten wir PIDEA-Zeugs immer in pidea-output Ordner machen und dann schauen ob Daten da sind?

## Prioritäten
1. **Hoch**: Status Badge & CDP Port Meldung
2. **Mittel**: IDE Integration & Start Scripts
3. **Mittel**: Task Management & Workflow Modal
4. **Niedrig**: Project Handling & Output Folder Structure
