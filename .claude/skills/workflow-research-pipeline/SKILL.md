---
description: Research pipeline workflow composing search, MYCA chat, Petri Dish/Compound Simulator, and Growth Analytics for hypothesis-driven scientific research.
---

# Research Pipeline Workflow

## Identity
- **Category**: workflows
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-search, ai-myca-chat, lab-petri-dish, lab-compound-simulator, lab-growth-analytics
- **Route**: Multiple routes (workflow spans several tools)
- **Key Components**: Composed from platform-search, ai-myca-chat, lab-petri-dish, lab-compound-simulator, lab-growth-analytics components

## Success Criteria (Eval)
- [ ] Platform search returns relevant scientific literature and data
- [ ] MYCA chat generates hypothesis suggestions based on search findings
- [ ] Petri Dish or Compound Simulator successfully runs a simulation based on the hypothesis
- [ ] Growth Analytics displays results with charts and statistical analysis
- [ ] Research summary document is generated with findings and conclusions

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in (see platform-authentication skill)
2. Use platform search to find scientific literature
3. Open MYCA chat and discuss findings for hypothesis generation
4. Set up a simulation in Petri Dish or Compound Simulator
5. Run Growth Analytics on simulation results
6. Document findings and generate research summary

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Platform search bar | Header area | Search for scientific literature and datasets |
| Search results with paper/data listings | Main content area | Click results to read abstracts and data summaries |
| MYCA chat interface | NatureOS sidebar or dedicated route | Conversational AI for hypothesis generation |
| MYCA message input | Bottom of chat panel | Type research questions and findings for analysis |
| MYCA response with hypothesis suggestions | Chat panel | Review AI-generated hypotheses and experimental designs |
| Petri Dish simulation setup | Lab tools section | Configure growth simulation parameters |
| Compound Simulator interface | Lab tools section | Configure compound interaction simulations |
| Simulation run button | Within simulator tool | Start the simulation |
| Simulation progress indicator | Within simulator viewport | Shows completion percentage |
| Growth Analytics dashboard | Lab tools section | Displays charts, curves, and statistical results |
| Export/Report button | Growth Analytics toolbar | Generate research summary document |

## Core Actions
### Action 1: Search scientific literature
**Goal:** Find relevant prior research and datasets
1. Click the platform search bar in the header
2. Enter search terms related to the research topic (species, compound, phenomenon)
3. Review results -- filter by type (papers, datasets, observations)
4. Click on relevant results to read abstracts and key findings
5. Note important findings to discuss with MYCA

### Action 2: Generate hypotheses with MYCA
**Goal:** Use AI assistance to formulate testable hypotheses
1. Navigate to MYCA chat (NatureOS > AI > MYCA or sidebar shortcut)
2. Summarize the literature findings in the chat input
3. Ask MYCA to suggest hypotheses -- e.g., "Based on these findings about X, what hypotheses could we test?"
4. Review MYCA's suggestions for feasibility and novelty
5. Ask follow-up questions to refine the hypothesis
6. Request experimental design suggestions from MYCA

### Action 3: Set up and run simulation
**Goal:** Test the hypothesis using Petri Dish or Compound Simulator
1. Navigate to the appropriate lab tool:
   - Petri Dish for growth/culture simulations
   - Compound Simulator for chemical/molecular simulations
2. Configure simulation parameters based on the hypothesis and MYCA's experimental design
3. Set initial conditions, variables, and duration
4. Click "Run Simulation" to start
5. Wait for simulation to complete (progress indicator shows status)
6. Review preliminary results in the simulator output panel

### Action 4: Analyze results with Growth Analytics
**Goal:** Perform statistical analysis and visualization of simulation data
1. Navigate to Growth Analytics (NatureOS > Lab > Growth Analytics)
2. Import or select the simulation results dataset
3. Review automatically generated charts (growth curves, time series, distributions)
4. Check statistical summaries (mean, variance, significance tests)
5. Compare results against the hypothesis predictions
6. Note any unexpected patterns or anomalies

### Action 5: Document and generate research summary
**Goal:** Compile findings into a structured research document
1. In Growth Analytics, click "Export" or "Generate Report"
2. Select which charts and analyses to include
3. Add notes and interpretations in the report editor
4. Include the original hypothesis and whether results support/reject it
5. Reference the literature sources from the initial search
6. Download or save the research summary

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Search returns no relevant results | Search terms too specific or domain mismatch | Broaden search terms; try synonyms or related concepts |
| MYCA gives generic or unhelpful responses | Insufficient context provided | Provide more detail about findings; ask more specific questions |
| Simulation fails to start | Invalid parameters or resource limits | Review parameter ranges; check for required fields; reduce simulation complexity |
| Simulation runs but produces no output | Simulation conditions result in null outcome | Adjust initial conditions; check for parameter conflicts |
| Growth Analytics shows no data | Data import failed or wrong format | Re-export from simulator; check data format compatibility |
| Report generation incomplete | Missing required sections or data | Ensure all analysis steps completed before generating report |

## Composability
- **Prerequisite skills**: platform-authentication, platform-search, ai-myca-chat
- **Next skills**: workflow-species-identification (if research involves species), lab-compound-simulator (deeper compound analysis)

## Computer Use Notes
- This is a multi-step workflow spanning 4-5 different tools -- allow navigation time between each
- MYCA chat maintains conversation context -- do not refresh the page mid-conversation
- Simulations may take seconds to minutes depending on complexity -- watch the progress indicator
- Growth Analytics auto-detects data format from supported simulators
- Research summaries are saved to the user's NatureOS workspace for later access
- Each tool can be used independently but the workflow provides the full research pipeline

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
