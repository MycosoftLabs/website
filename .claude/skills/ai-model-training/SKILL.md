---
description: Train and fine-tune the NLM (Natural Language Model) at mycosoft.com/natureos/model-training — manage training runs, hyperparameters, GPU monitoring, neural plasticity mutations, checkpoints, model export, and real-time loss/accuracy visualization.
---

# NLM Model Training

## Identity
- **Category**: ai
- **Access Tier**: COMPANY
- **Depends On**: platform-natureos-dashboard
- **Route**: /natureos/model-training
- **Key Components**: app/natureos/model-training/page.tsx, app/natureos/model-training/translator.tsx (NlmDemo), components/visualizers/FungaNetwork3D.tsx, api/natureos/nlm-training (backend API)

## Success Criteria (Eval)
- [ ] Model training dashboard loads showing training status (idle/training/paused/evaluating), model health, GPU stats, and connection indicators (MAS, MINDEX, GPU, MycoBrain)
- [ ] Configure hyperparameters (learning rate, batch size, epochs, warmup steps, weight decay, dropout, optimizer, scheduler, gradient clipping) and start a training run
- [ ] Monitor real-time training progress: epoch counter, loss history, accuracy history, gradient norm, samples processed, elapsed time
- [ ] Apply neural plasticity mutations (prune, grow, rewire, perturb) to specific layers during training
- [ ] Save checkpoints, export models in GGUF format, and run inference tests against the trained model

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in with company-level access
2. Open the NatureOS dashboard at /natureos
3. In the sidebar, expand "AI & Agents" section and click "Model Training", or navigate directly to /natureos/model-training
4. The NLM Model Training dashboard loads with a Pipeline tab as the default view
5. The page shows training status cards at the top, followed by tabbed content areas

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Training status indicator (idle/training/paused/evaluating) | Top status cards | Shows current state of the training pipeline |
| Model health card (model name, version, loaded status) | Top status cards | Confirms model is loaded and ready |
| GPU stats card (name, memory used/total, utilization %, temperature, power draw) | Top status cards | Monitor hardware resources during training |
| Connection indicators (MAS, MINDEX, GPU, MycoBrain) | Top status area | Green = connected; check before starting training |
| Hyperparameter controls (sliders, selects, inputs) | Pipeline tab, configuration section | Adjust learning rate, batch size, epochs, warmup, weight decay, dropout, optimizer (adamw), scheduler (cosine), grad clip |
| Start Training button | Pipeline tab, near hyperparameters | Sends start action with current hyperparameter config to /api/natureos/nlm-training |
| Pause / Resume / Stop buttons | Pipeline tab, training controls | Control active training run (requires active runId) |
| Save Checkpoint button | Pipeline tab, training controls | Saves current model state as a checkpoint |
| Export button (GGUF format) | Pipeline tab, training controls | Exports trained model for deployment |
| Loss/accuracy history charts | Pipeline tab, metrics section | Real-time training curves — loss should decrease, accuracy should increase |
| Epoch progress (current/total) | Pipeline tab, metrics section | Shows training advancement |
| Gradient norm display | Pipeline tab, metrics section | Monitors gradient health — spikes indicate instability |
| Plasticity controls (enable toggle, rate slider) | Pipeline tab, plasticity section | Enable neural plasticity for dynamic architecture modification |
| Mutation mode selector (prune/grow/rewire/perturb) | Pipeline tab, plasticity section | Choose mutation type to apply |
| Auto-mutate toggle with threshold | Pipeline tab, plasticity section | Automatically apply mutations when loss plateaus below threshold |
| Layer selector | Pipeline tab, plasticity/visualization | Target specific layers for mutation or inspection |
| Visualization mode (network/weights/activations/attention) | Visualization section | Switch between different neural network visualization modes |
| FungaNetwork3D visualization | Visualization section | 3D Three.js rendering of network architecture |
| Inference test input/output | Inference section | Type text input, run inference, see model output |
| NLM Demo (translator) | Translator tab or section | Interactive NLM translation demonstration |

## Core Actions
### Action 1: Configure and start a training run
**Goal:** Fine-tune the NLM with custom hyperparameters
1. Navigate to /natureos/model-training
2. Verify connection indicators show green for GPU (required) and optionally MAS/MINDEX
3. Adjust hyperparameters: learning rate (default 2e-5), batch size (default 4), epochs (default 3), warmup steps (default 100), weight decay (default 0.01), dropout (default 0.05)
4. Select optimizer (adamw) and scheduler (cosine)
5. Click "Start Training" — the backend begins a training run
6. Watch the status change from "idle" to "training"
7. Monitor loss/accuracy charts updating in real-time (polling every 3 seconds during training)

### Action 2: Apply neural plasticity mutations
**Goal:** Dynamically modify network architecture during training
1. During an active training run, enable the Plasticity toggle
2. Set the plasticity rate (default 0.05)
3. Select a mutation mode: prune (remove connections), grow (add connections), rewire (change connections), or perturb (add noise)
4. Optionally select a target layer, or leave blank to apply globally
5. Click to apply the mutation — the mutation event is logged with type, target, magnitude, and impact
6. Alternatively, enable auto-mutate with a loss threshold (default 0.01) to trigger mutations automatically when loss plateaus

### Action 3: Save checkpoint and export model
**Goal:** Preserve training progress and export for deployment
1. During or after training, click "Save Checkpoint" to persist current model state
2. The checkpoint appears in the checkpoints list with metadata
3. When training is complete, click "Export" to generate a GGUF-format model file
4. The exported model can be deployed to edge nodes for MYCA inference

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| GPU card shows null/empty values | No GPU detected or nvidia-smi unavailable | Ensure NVIDIA GPU with drivers is available on the training server; check /api/natureos/nlm-training health |
| "Start Training" returns error | Model not loaded or insufficient GPU memory | Check model health card — model must be loaded; reduce batch size if GPU memory is tight |
| Loss history shows NaN or sudden spikes | Gradient explosion or learning rate too high | Reduce learning rate; ensure gradient clipping is enabled (default 1.0); try lowering warmup steps |
| Connection indicator shows MAS offline | MAS orchestrator unreachable | Training can proceed without MAS, but agent coordination features are unavailable |
| Mutation fails with "no active runId" | Training not running when mutation attempted | Start or resume training first, then apply mutations |
| Export fails | No completed training run or checkpoint available | Complete at least one training epoch and save a checkpoint before exporting |
| Page shows loading spinner indefinitely | /api/natureos/nlm-training endpoint unreachable | Check that the NLM training backend service is running |

## Composability
- **Prerequisite skills**: platform-natureos-dashboard (NatureOS layout and sidebar navigation)
- **Next skills**: ai-studio (deploy trained model into MAS), ai-myca-chat (test trained model via MYCA chat), ai-explainer (understand the transformer architecture being trained)
- **Related**: device-telemetry (GPU metrics from edge devices), infra-monitoring (system-level resource tracking)

## Computer Use Notes
- Data polling frequency adapts: 3-second intervals during active training, 10-second intervals when idle
- The FungaNetwork3D visualization can be resource-intensive — it renders via Three.js and may compete with GPU training for resources
- Hyperparameter changes only take effect when starting a new training run — they are sent as parameters to the "start" action
- The mutation log accumulates events in client state — refresh the page to clear
- All training control actions (start, pause, resume, stop, checkpoint, export, mutate) go through POST /api/natureos/nlm-training with an action field
- The fullscreen visualization toggle overlays the 3D network view — press the minimize button to exit
- Architecture details (base model, hidden size, num layers, attention heads, vocab size, LoRA config) are fetched from the backend and displayed read-only

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
