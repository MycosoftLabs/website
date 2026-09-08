# ITDX presentation objectives — 16-task capability register

**Source:** the owner transcribed the following objective statement and task list from the organizers' presentation into this conversation on 2026-09-08. This is a user-supplied transcription of the presentation, not an independently downloaded slide deck. Preserve that attribution. The detailed task formats, scenario pack, training datasets, evaluation procedures and acceptance thresholds have not been supplied with the list.

> To develop, train, and test algorithms to perform the 16 intelligence tasks.

The earlier Mycosoft preparation packet selected Tasks 12, 13 and 8, with Task 14 as a map product. The complete program has 16 objectives. The 41 local preparation scenarios test the selected prototype capabilities; they are not 41 program objectives and do not demonstrate all 16 tasks.

## Exact objective list and current coverage

Coverage below describes the **uploaded v1.2 application**. Potential system connections identify relevant infrastructure, not verified live capability or a completed military analysis product. Production capabilities need the separate inventory in `CURSOR_HANDOFF.md`.

| ID | Organizer objective, as supplied | v1.2 coverage | Relevant system connection / gap to document |
|---|---|---|---|
| 1 | Prepare an Annex B | NOT IMPLEMENTED; documents can be imported and searched | MYCA/document workspace and MINDEX evidence references could support an analyst-provided document workflow; required template and review rubric absent |
| 2 | Prepare an Annex L | NOT IMPLEMENTED | Same document/evidence infrastructure; obtain the actual exercise's Annex L definition, format and required fields rather than assuming them |
| 3 | Build a Modified Combined Obstacles Overlay (MCOO) | NOT IMPLEMENTED; existing map is not an MCOO | CREP/Earth can be evaluated as a display surface for approved supplied layers; required input layers, interpretation and product specification absent |
| 4 | Prepare a Terrain Effects Matrix | NOT IMPLEMENTED; coordinates/grid are not a terrain-effects model | Earth/MINDEX geographic context and an analyst-reviewed matrix workspace; required terrain data and validated task method absent |
| 5 | Prepare a Weather Effects Matrix | NOT IMPLEMENTED; environmental measurements do not constitute this matrix | NLM/environmental observations, MINDEX source records and Earth visualization are relevant inputs; official matrix definitions and method absent |
| 6 | Prepare a Key Systems Matrix by Warfighting Function | NOT IMPLEMENTED | MINDEX typed records and an analyst-provided structured matrix could be connected; required taxonomy, data and evaluation method absent |
| 7 | Produce a Doctrinal Template | NOT IMPLEMENTED | Document/template provenance and versioning could be reused; authoritative supplied template and task-specific validation absent |
| 8 | Produce Courses of Action | LOCAL PROTOTYPE | Three bounded environmental/civil-support advisory options, deterministic review roles and scalar AVANI; full live MYCA workflow and exercise qualification missing |
| 9 | Produce a Situational Template | NOT IMPLEMENTED | Shared temporal/geographic evidence could be referenced by a supplied product; required template, scenario inputs and validated method absent |
| 10 | Prepare a Civilian Considerations Assessment | PARTIAL SUPPORT | Source-report review and all 36 ASCOPE/PMESII cells exist; a complete assessment, accepted inputs, official rubric and live service integration are not established |
| 11 | Conduct Battle Damage Assessment (BDA) | NOT IMPLEMENTED | General source/time/revision/proof infrastructure could preserve supplied assessment records; no BDA dataset, qualified method or task workflow is included |
| 12 | Perform Pattern Analysis | LOCAL PROTOTYPE | Native 16D encoder, local temporal readout and baselines; intended trained architecture and real task qualification missing |
| 13 | Perform Link Analysis | LOCAL PROTOTYPE | Deterministic typed evidence graph and source-removal tests; intended learned graph backend and real task qualification missing |
| 14 | Produce products on a Map | LOCAL PROTOTYPE | Native CREP bridge, GeoJSON and offline angular map; shared live Earth/CREP display and actual browser qualification missing |
| 15 | Produce a Collection Plan | NOT IMPLEMENTED | Evidence-gap metadata and a supplied analyst document can be preserved; the required plan format, task method and evaluation criteria are absent |
| 16 | Prepare an Event Template | NOT IMPLEMENTED | Time-indexed evidence and recorded pattern outputs can be referenced; they are not a qualified event-template workflow |

Summary: **4 local prototypes, 1 partial support capability, 11 unimplemented task workflows. Zero tasks have been established by this handoff as accepted, fully live program implementations.** Training is likewise partial: the local 25-parameter readout can be fitted on declared splits; it is not a trained solution for all 16 objectives.

## Changes Cursor must make to the workspace scope

1. Implement a versioned **16-task registry** using `TASK_OBJECTIVES.csv`. Keep task identity distinct from scenario ID, model ID and output ID. Show every objective in the walkthrough, with its actual readiness, prerequisites, available products and evidence.
2. Preserve the current four-task local baseline and the partial Task 10 source-review module. Opening a document, drawing a generic map or filling a matrix cell must not automatically mark another objective complete.
3. Add an input/output contract record for each objective: organizer source/version, supplied template, required fields, allowed data origins, truth/adjudication requirements, algorithm/backend actually used, output schema and acceptance procedure. Unknown fields remain `NOT_SUPPLIED`.
4. Separate three gates: **developed** (executable task implementation), **trained/qualified** (where relevant, model/data/method evidence), and **tested/accepted** (measured task results and evaluator disposition). A deterministic renderer may have training marked `NOT_APPLICABLE` with a reason; a missing learned model cannot use that status to evade qualification.
5. Build shared case, document, matrix, layer, provenance, job and export infrastructure first. Task-specific analytical logic needs its actual authorized inputs, product definitions and evaluation method; do not invent them from the task name.
6. Retain supplied analyst-authored documents and assessments as such. Generated text or a guessed template must not impersonate an accepted operational product. Task products remain subject to their specified human review; this handoff does not provide operational targeting, collection or maneuver instructions.
7. Extend test/export manifests to enumerate all requested task IDs, completed products, blocked/missing tasks and explicit reasons. A four-task run can complete its declared scope without being represented as a completed 16-task evaluation.
8. Add organizer scenarios as separate versioned records and map them many-to-many to objectives. Attach the source slide/template/rubric when received. Do not rename existing synthetic coastal fixtures as official Army injects.

## Task registry contract

For each task, persist `task_id`, `title`, `objective_source`, `source_verification`, `definition_version`, `implementation_status`, `training_requirement`, `qualification_status`, `test_status`, `official_acceptance_status`, `prerequisites`, `input_schema_ref`, `output_schema_ref`, `rubric_ref`, `supported_backends`, `product_refs`, `evidence_refs` and `blockers`.

Suggested implementation states are `NOT_IMPLEMENTED`, `PARTIAL_SUPPORT`, `LOCAL_PROTOTYPE`, `INTEGRATION_IN_PROGRESS`, `LIVE_IMPLEMENTED`. Keep `TESTED` and `ACCEPTED` out of that enum: they belong to independently evidenced evaluation fields. `LIVE_IMPLEMENTED` requires actual output from the declared deployed backend, not merely a reachable page.

## Additional acceptance checks

- **OBJ-01:** The task selector displays exactly these 16 stable IDs/titles and links the user-transcribed objective source.
- **OBJ-02:** Initial v1.2 coverage is 4 local prototypes, 1 partial support and 11 unimplemented workflows. The UI/export does not imply full coverage.
- **OBJ-03:** Tasks and scenarios have separate identifiers; the 41 internal cases do not inflate the task count or official test count.
- **OBJ-04:** A task without its required template/data/method remains blocked with specific missing inputs and can preserve supplied documents without fabricating completion.
- **OBJ-05:** Each completed product identifies the input revision, task contract, actual backend, model/method qualification, reviewer disposition and acceptance evidence.
- **OBJ-06:** The run/export declares whether it covers the selected four tasks, another subset, or all 16, and lists absent requested products explicitly.

This objective list resolves the top-level program scope. It does **not** resolve the missing official injects, 1–5 definitions, task templates or acceptance thresholds. Carry both facts into the readiness screen and final release report.
