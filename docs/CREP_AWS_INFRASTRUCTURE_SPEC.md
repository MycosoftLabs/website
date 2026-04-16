# CREP AWS Infrastructure Specification
## Scaling 100 to 100,000 Concurrent Users
### April 2026 | Mycosoft

---

## Architecture Overview

```
Users (browsers) ──→ Cloudflare CDN ──→ ALB ──→ ECS Fargate (Next.js)
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                              MINDEX API      MAS GPU API     MQTT Broker
                              (PostGIS)      (Earth-2/SGP4)   (MycoBrain)
                                    │               │               │
                                    ▼               ▼               ▼
                              RDS PostgreSQL   EC2 GPU        Amazon MQ
                              + ElastiCache    (p3/g5)        (MQTT)
```

**Key principle:** CREP rendering is CLIENT-SIDE (WebGL via MapLibre in each browser). The server only serves JSON data APIs. No server GPU needed for map rendering — each user's browser GPU does the work.

---

## TIER 1: 100-500 Users ($800-1,500/mo)

### Compute (Next.js Frontend)
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| ECS Fargate | 2 tasks × 2 vCPU / 4GB RAM | Next.js SSR + API routes | ~$150/mo |
| ALB | 1 Application Load Balancer | HTTPS termination, health checks | ~$25/mo |

### Data (MINDEX)
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| RDS PostgreSQL | db.r6g.large (2 vCPU, 16GB) with PostGIS | Spatial queries, entity storage | ~$200/mo |
| ElastiCache Redis | cache.r6g.large (2 vCPU, 13GB) | API response caching, session state | ~$150/mo |
| S3 | 100GB Standard | Static GeoJSON, species images, TLE data | ~$5/mo |

### GPU (Earth-2 + SGP4)
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| EC2 g5.xlarge | 1× NVIDIA A10G (24GB VRAM), 4 vCPU, 16GB RAM | Earth-2 inference, SGP4 batch propagation | ~$250/mo (reserved) |

### Messaging (MQTT)
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| Amazon MQ | mq.m5.large, ActiveMQ with MQTT | MycoBrain device telemetry | ~$100/mo |

### CDN & DNS
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| Cloudflare Pro | Existing | CDN, DDoS, WAF, caching | $20/mo |

**Tier 1 Total: ~$900/mo**

---

## TIER 2: 500-5,000 Users ($3,000-6,000/mo)

### Compute (Next.js Frontend)
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| ECS Fargate | 4-8 tasks × 4 vCPU / 8GB RAM (auto-scaling) | Next.js SSR + API routes | ~$600/mo |
| ALB | 1 ALB with target group auto-scaling | Load distribution | ~$50/mo |

### Data (MINDEX)
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| RDS PostgreSQL | db.r6g.xlarge (4 vCPU, 32GB) Multi-AZ | PostGIS spatial queries, read replicas | ~$600/mo |
| RDS Read Replica | db.r6g.large × 1 | Read-heavy API queries offloaded | ~$200/mo |
| ElastiCache Redis | cache.r6g.xlarge (4 vCPU, 26GB), cluster mode | Hot data cache, rate limiting | ~$350/mo |
| S3 | 500GB Standard + CloudFront | Static assets, species catalog images | ~$20/mo |
| OpenSearch | t3.medium.search × 2 | Full-text species search, NLM queries | ~$150/mo |

### GPU (Earth-2 + SGP4 + Species AI)
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| EC2 g5.2xlarge | 1× A10G (24GB), 8 vCPU, 32GB RAM | Earth-2 weather models | ~$500/mo (reserved) |
| EC2 g5.xlarge | 1× A10G (24GB), 4 vCPU, 16GB RAM | SGP4 batch + species classification | ~$250/mo (reserved) |

### Messaging
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| Amazon MQ | mq.m5.large × 2, active/standby | MQTT broker HA, device telemetry | ~$200/mo |
| Amazon MSK | kafka.m5.large × 3 | Entity event streaming (aircraft/vessel updates) | ~$500/mo |

### Monitoring
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| CloudWatch | Standard metrics + custom | Latency, error rates, GPU utilization | ~$50/mo |
| X-Ray | Tracing enabled | Request tracing, bottleneck detection | ~$30/mo |

**Tier 2 Total: ~$3,500/mo**

---

## TIER 3: 5,000-50,000 Users ($10,000-25,000/mo)

### Compute (Next.js Frontend)
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| ECS Fargate | 8-20 tasks × 4 vCPU / 8GB (auto-scale 2-40) | Next.js SSR + API routes | ~$2,000/mo |
| ALB | 2 ALBs (US-West + US-East) | Regional load balancing | ~$100/mo |
| CloudFront | Custom origin, edge caching | API response edge caching | ~$200/mo |

### Data (MINDEX) — Distributed
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| RDS PostgreSQL | db.r6g.2xlarge (8 vCPU, 64GB) Multi-AZ | Primary PostGIS, write master | ~$1,200/mo |
| RDS Read Replicas | db.r6g.xlarge × 3 (cross-region) | Read scaling, geo-distributed | ~$900/mo |
| ElastiCache Redis | cache.r6g.2xlarge × 3 node cluster | Distributed cache, pub/sub | ~$1,000/mo |
| S3 | 2TB + Intelligent Tiering | Species catalog, observation images | ~$50/mo |
| OpenSearch | c6g.xlarge.search × 3 | Species/entity full-text search | ~$500/mo |

### GPU Fleet
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| EC2 g5.4xlarge | 1× A10G (24GB), 16 vCPU, 64GB RAM | Earth-2 weather ensemble models | ~$1,000/mo |
| EC2 g5.2xlarge × 2 | 2× A10G total | SGP4 propagation + species AI + inference | ~$1,000/mo |
| SageMaker Endpoint | ml.g5.xlarge | NLM species model serving | ~$500/mo |

### Messaging & Streaming
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| Amazon MQ | mq.m5.large × 2 HA | MQTT for 10K device connections | ~$200/mo |
| Amazon MSK | kafka.m5.xlarge × 3 | Real-time entity streaming pipeline | ~$1,000/mo |
| Kinesis Data Streams | 10 shards | AIS/ADS-B ingest firehose | ~$300/mo |

### Data Pipelines
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| AWS Glue | ETL jobs | GBIF/iNaturalist bulk import (305M obs) | ~$200/mo |
| Step Functions | Orchestration | Data pipeline coordination | ~$50/mo |

**Tier 3 Total: ~$10,200/mo**

---

## TIER 4: 50,000-100,000 Users ($25,000-60,000/mo)

### Compute — Global Edge
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| ECS Fargate | 20-50 tasks × 4 vCPU / 16GB (auto-scale 10-100) | Next.js across 3 regions | ~$5,000/mo |
| Global Accelerator | Anycast routing | Lowest latency routing | ~$200/mo |
| CloudFront | Full site + API edge caching | 50ms global TTFB | ~$500/mo |

### Data — Multi-Region
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| Aurora PostgreSQL Global | db.r6g.4xlarge writer + 5 readers across 3 regions | PostGIS, <10ms reads globally | ~$4,000/mo |
| ElastiCache Global Datastore | r6g.2xlarge × 6 (2 per region) | Sub-ms cache, 100K+ ops/sec | ~$3,000/mo |
| S3 + Replication | 10TB, cross-region replication | Species images, static data | ~$250/mo |
| OpenSearch | c6g.2xlarge.search × 6 (multi-AZ) | Species search at scale | ~$2,000/mo |

### GPU Fleet — Dedicated
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| EC2 p3.2xlarge | 1× V100 (16GB), 8 vCPU, 61GB | Earth-2 FourCastNet inference | ~$2,000/mo |
| EC2 g5.8xlarge | 1× A10G (24GB), 32 vCPU, 128GB | Multi-model serving (SGP4 + species + NLM) | ~$2,000/mo |
| SageMaker Multi-Model | ml.g5.2xlarge × 2 | Species classification + chemistry models | ~$2,000/mo |
| EC2 Inf2.xlarge | 1× Inferentia2 | Low-cost inference for high-throughput | ~$500/mo |

### Messaging — High Throughput
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| Amazon IoT Core | 100K device connections | MQTT at scale (replaces Amazon MQ) | ~$500/mo |
| Amazon MSK Serverless | Auto-scaling | Entity event streaming, no capacity planning | ~$2,000/mo |
| Kinesis Data Streams | 50 shards | Real-time AIS/ADS-B/satellite ingest | ~$1,500/mo |
| EventBridge | Event bus | Cross-service event routing | ~$100/mo |

### ML & Analytics
| Resource | Spec | Purpose | Cost |
|----------|------|---------|------|
| SageMaker | Training + endpoints | Species NLM, threat detection models | ~$3,000/mo |
| Athena | Query engine | Historical observation analytics | ~$200/mo |
| QuickSight | BI dashboards | Operational metrics | ~$200/mo |

**Tier 4 Total: ~$29,000/mo**

---

## GPU SELECTION GUIDE

### What Each GPU Type Does for CREP

| GPU | VRAM | Best For | Users Supported |
|-----|------|----------|----------------|
| **NVIDIA T4** (g4dn) | 16GB | Basic inference, SGP4 batch | 100-1,000 |
| **NVIDIA A10G** (g5) | 24GB | Earth-2 models, species AI, multi-model | 1,000-10,000 |
| **NVIDIA V100** (p3) | 16-32GB | FourCastNet training, large batch inference | 10,000-50,000 |
| **NVIDIA A100** (p4d) | 40-80GB | Full Earth-2 ensemble, NLM training | 50,000+ |
| **AWS Inferentia2** (inf2) | 32GB HBM | High-throughput inference (cheapest per query) | Any scale |

### CREP-Specific GPU Workloads

1. **Earth-2 Weather Models** — FourCastNet/CorrDiff inference
   - Input: Global weather grid (0.25° resolution)
   - Output: 15-day forecast, precipitation, wind vectors
   - GPU need: A10G minimum, V100 for ensemble runs
   - Frequency: Every 6 hours (not real-time)

2. **SGP4 Satellite Propagation** — Batch position computation
   - Input: 600+ TLE records
   - Output: Lat/lng/alt/velocity per satellite per second
   - GPU need: T4 sufficient (embarrassingly parallel)
   - Frequency: Every 1 second × 600 satellites = 600 propagations/sec

3. **Species Classification AI** — Image-based species ID
   - Input: Observation photo
   - Output: Species name, confidence, taxonomy
   - GPU need: T4 for single model, A10G for multi-model
   - Frequency: Per new observation (~100/min at peak)

4. **NLM Species Models** — Chemistry/genetics embeddings
   - Input: Species name or chemical compound
   - Output: Similar species, drug interactions, ecological role
   - GPU need: A10G minimum for embedding models
   - Frequency: Per search query

---

## AUTO-SCALING CONFIGURATION

### ECS Fargate Auto-Scaling
```yaml
Target Tracking:
  - Metric: ECSServiceAverageCPUUtilization
    Target: 60%
    ScaleIn: 300s cooldown
    ScaleOut: 60s cooldown
  
  - Metric: ALBRequestCountPerTarget  
    Target: 1000 requests/min per task
    
Step Scaling:
  - CPU > 80%: +4 tasks
  - CPU > 90%: +8 tasks
  - CPU < 30%: -2 tasks (min 2)

Capacity:
  Min: 2 tasks
  Max: 100 tasks
  Desired: based on time-of-day schedule
```

### GPU Auto-Scaling (EC2 Fleet)
```yaml
GPU Fleet:
  - Base: 1× g5.xlarge (always on, reserved pricing)
  - Burst: 0-4× g5.xlarge (spot instances, 60-90% discount)
  
Triggers:
  - GPU utilization > 70%: launch spot instance
  - Queue depth > 100 inference requests: launch spot
  - No requests for 15 min: terminate spot instances
```

### Redis Cache Scaling
```yaml
ElastiCache:
  Cluster mode: enabled
  Shards: 3 (auto-scale 1-10)
  Replicas per shard: 2
  
  Scale trigger:
  - EngineCPUUtilization > 65%: add shard
  - CurrConnections > 50000: add replica
```

---

## NETWORK ARCHITECTURE

```
Internet
    │
    ▼
Cloudflare (CDN + WAF + DDoS)
    │
    ▼
AWS Global Accelerator (anycast)
    │
    ├──→ us-west-2 (primary)
    │       ├── ALB → ECS Fargate (Next.js)
    │       ├── RDS Aurora (writer)
    │       ├── ElastiCache (primary)
    │       ├── EC2 GPU (Earth-2)
    │       └── Amazon IoT Core (MQTT)
    │
    ├──→ us-east-1 (secondary)
    │       ├── ALB → ECS Fargate (Next.js)
    │       ├── Aurora Read Replica
    │       ├── ElastiCache (replica)
    │       └── EC2 GPU (SGP4 + AI)
    │
    └──→ eu-west-1 (tertiary, future)
            ├── ALB → ECS Fargate
            ├── Aurora Read Replica
            └── ElastiCache (replica)
```

---

## DATA FLOW AT SCALE

### Real-Time Entity Pipeline (Aircraft/Vessels/Satellites)
```
External APIs ──→ Kinesis Data Stream ──→ Lambda (normalize)
    │                                         │
    ▼                                         ▼
FlightRadar24                          Aurora PostgreSQL
OpenSky Network                        (PostGIS spatial index)
AISstream                                    │
CelesTrak                                    ▼
NOAA NDBC                              ElastiCache Redis
                                       (hot entity cache)
                                             │
                                             ▼
                                       API Response ──→ Browser (MapLibre WebGL)
```

### Species Observation Pipeline
```
iNaturalist API ──→ CREP Frontend ──→ MINDEX Ingest ──→ Aurora PostGIS
GBIF API                                                      │
                                                              ▼
                                                    OpenSearch (full-text)
                                                              │
                                                              ▼
                                                    S3 (images archive)
                                                              │
                                                              ▼
                                                    SageMaker (species AI)
```

---

## COST OPTIMIZATION STRATEGIES

1. **Reserved Instances** — 1-year commitment saves 30-40% on RDS, ElastiCache, base GPU
2. **Spot Instances** — GPU burst capacity at 60-90% discount (with fallback to on-demand)
3. **S3 Intelligent Tiering** — Auto-moves cold species data to cheaper storage
4. **CloudFront caching** — 80%+ of API responses cacheable (entity positions update every 2-30s)
5. **Right-sizing** — Start Tier 1, scale up based on actual usage metrics
6. **Off-peak scaling** — Reduce to 2 Fargate tasks 12am-6am (70% of day at lower cost)

---

## RECOMMENDED STARTING CONFIGURATION

**Start with Tier 1 ($900/mo) and scale to Tier 2 ($3,500/mo) when you hit 500 concurrent users.**

### Day 1 AWS Setup (tomorrow):
1. ECS Fargate cluster (2 tasks) + ALB
2. RDS PostgreSQL with PostGIS (MINDEX database)
3. ElastiCache Redis (API cache)
4. EC2 g5.xlarge (GPU for Earth-2)
5. Amazon MQ (MQTT broker for MycoBrain)
6. S3 bucket (static GeoJSON, species images)
7. CloudFront distribution (CDN)

### Env vars to update:
```
MINDEX_API_URL=https://mindex.mycosoft.com
MAS_API_URL=https://mas.mycosoft.com
MQTT_BROKER_URL=wss://mqtt.mycosoft.com
NEXT_PUBLIC_MINDEX_URL=https://mindex.mycosoft.com
```

No code changes needed — everything uses env vars already.
