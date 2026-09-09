---
id: Plan-014-log
title: "History of Plan-014"
type: log
---
## History

* 2026-09-08 - Plan created from the composite review SR-160..SR-168 of issue
  #36 and the orchestrator decisions D1..D15. Twelve tasks, Task-127..Task-138,
  in SR-163's recommended order with one swap: FR-099's binary precedes
  FR-098's goldens because `lift --write-goldens` is the only sanctioned
  golden writer. FR-096 and FR-095 run in parallel after FR-091.
* 2026-09-08 - Recorded PR #84 as the first sequencing rule (SR-168
  FND-1480): rebase after it lands, before Task-134 shells to the FR-050
  reader. Recorded that publication is out of scope (`publish = false`) and
  that TC-1337 stays un-tasked, blocked on filament-core-data#85.
* 2026-09-09 - Post-review fix pass (CR-036-9) over SR-169 and SR-170: the
  requirement and test-plan checkboxes ticked (every task `done`, 145 of
  151 rows green, TC-1316/1317 static evidence red on #89 and the scratch
  clone environment, TC-1290..1292 and TC-1337 blocked on #87, #88, the
  rust-serde `NAME_COLLISION` defect and #85), the TC-1339 note corrected
  (it is FR-097-AC-16; TC-1350 is NFR-033's last row). Task-134's first
  subtask — confirm PR #84 merged, rebase onto `main`, re-run the reader
  rows — stays unticked on purpose: PR #84 is still open and `origin/main`
  is at 3b75e01, so TC-1219, TC-1230, TC-1245, TC-1258 and TC-1283 were
  verified against the pre-#84 `src/compiler/ir/reader.mjs` and must be
  re-run after the rebase (SR-170 FND-1502). The plan therefore stays
  `status: active` until that subtask closes.
