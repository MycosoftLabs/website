/**
 * Complete MAS Agent Registry
 * Based on AGENT_REGISTRY.md v2.1.0 - 223+ Agents
 * 
 * This file defines all known agents in the Mycosoft Multi-Agent System
 * for use in the topology visualization.
 */

import type { NodeType, NodeCategory, NodeStatus, TopologyNode } from "./types"

export interface AgentDefinition {
  id: string
  name: string
  shortName: string
  type: NodeType
  category: NodeCategory
  description: string
  port?: number
  defaultStatus: NodeStatus
  priority: number // 1-10, higher = more important
  canStart: boolean
  canStop: boolean
  canRestart: boolean
  canConfigure: boolean
}

// ============================================
// CORE AGENTS (10)
// ============================================
const CORE_AGENTS: AgentDefinition[] = [
  { id: "myca-orchestrator", name: "MYCA Orchestrator", shortName: "MYCA", type: "orchestrator", category: "core", description: "Central cognitive agent coordinating all other agents", port: 8001, defaultStatus: "active", priority: 10, canStart: true, canStop: false, canRestart: true, canConfigure: true },
  { id: "memory-manager", name: "Memory Manager", shortName: "Memory", type: "service", category: "core", description: "Short-term and long-term memory management", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "task-router", name: "Task Router", shortName: "Router", type: "service", category: "core", description: "Routes incoming tasks to appropriate agents", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "priority-queue", name: "Priority Queue", shortName: "Queue", type: "queue", category: "core", description: "Manages task prioritization and scheduling", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "health-monitor", name: "Health Monitor", shortName: "Health", type: "service", category: "core", description: "Monitors all agent health and system status", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scheduler", name: "Scheduler", shortName: "Sched", type: "service", category: "core", description: "Cron-like scheduling for recurring tasks", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "dashboard", name: "Dashboard Agent", shortName: "Dash", type: "service", category: "core", description: "UniFi-style dashboard state management", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "logger", name: "Logger Agent", shortName: "Logger", type: "service", category: "core", description: "Centralized logging across all agents", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "config-manager", name: "Config Manager", shortName: "Config", type: "service", category: "core", description: "Dynamic configuration management", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "heartbeat", name: "Heartbeat Agent", shortName: "HB", type: "service", category: "core", description: "Agent liveness detection", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: false },
]

// ============================================
// FINANCIAL AGENTS (12)
// ============================================
const FINANCIAL_AGENTS: AgentDefinition[] = [
  { id: "financial", name: "Financial Orchestrator", shortName: "Finance", type: "agent", category: "financial", description: "Master financial orchestrator", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "mercury", name: "Mercury Agent", shortName: "Mercury", type: "integration", category: "financial", description: "Mercury bank API integration", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "stripe", name: "Stripe Agent", shortName: "Stripe", type: "integration", category: "financial", description: "Stripe payment processing", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "accounting", name: "Accounting Agent", shortName: "Acct", type: "agent", category: "financial", description: "QuickBooks/Xero integration", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "invoice", name: "Invoice Agent", shortName: "Invoice", type: "agent", category: "financial", description: "Automated invoice generation", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "budget", name: "Budget Agent", shortName: "Budget", type: "agent", category: "financial", description: "Budget tracking and forecasting", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "payroll", name: "Payroll Agent", shortName: "Payroll", type: "agent", category: "financial", description: "Payroll automation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "tax", name: "Tax Agent", shortName: "Tax", type: "agent", category: "financial", description: "Tax calculation and filing", defaultStatus: "offline", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "expense", name: "Expense Agent", shortName: "Expense", type: "agent", category: "financial", description: "Expense tracking", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "treasury", name: "Treasury Agent", shortName: "Treasury", type: "agent", category: "financial", description: "Cash flow management", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "investment", name: "Investment Agent", shortName: "Invest", type: "agent", category: "financial", description: "Investment tracking", defaultStatus: "offline", priority: 4, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "audit-financial", name: "Financial Audit Agent", shortName: "Audit-Fin", type: "agent", category: "financial", description: "Financial audit trails", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// MYCOLOGY AGENTS (25)
// ============================================
const MYCOLOGY_AGENTS: AgentDefinition[] = [
  { id: "mycology-bio", name: "Mycology Bio Agent", shortName: "MycoBio", type: "agent", category: "mycology", description: "Core mycology research", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "species-classifier", name: "Species Classifier", shortName: "Species", type: "agent", category: "mycology", description: "AI species identification", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "taxonomy-manager", name: "Taxonomy Manager", shortName: "Taxonomy", type: "agent", category: "mycology", description: "Taxonomic hierarchy management", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "trait-extractor", name: "Trait Extractor", shortName: "Traits", type: "agent", category: "mycology", description: "Trait extraction from text", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "edibility-classifier", name: "Edibility Classifier", shortName: "Edibility", type: "agent", category: "mycology", description: "Edibility determination", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "toxicity-analyzer", name: "Toxicity Analyzer", shortName: "Toxicity", type: "agent", category: "mycology", description: "Toxin identification", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "habitat-mapper", name: "Habitat Mapper", shortName: "Habitat", type: "agent", category: "mycology", description: "Habitat preference mapping", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "distribution-tracker", name: "Distribution Tracker", shortName: "Distrib", type: "agent", category: "mycology", description: "Geographic distribution", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "morphology-analyzer", name: "Morphology Analyzer", shortName: "Morph", type: "agent", category: "mycology", description: "Physical characteristic analysis", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "phylogeny-builder", name: "Phylogeny Builder", shortName: "Phylo", type: "agent", category: "mycology", description: "Evolutionary tree construction", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "synonym-resolver", name: "Synonym Resolver", shortName: "Synonyms", type: "agent", category: "mycology", description: "Taxonomic synonym resolution", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "image-classifier", name: "Image Classifier", shortName: "ImgClass", type: "agent", category: "mycology", description: "Mushroom image classification", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "spore-tracker", name: "Spore Tracker", shortName: "Spores", type: "agent", category: "mycology", description: "Spore collection management", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "growth-analyzer", name: "Growth Analyzer", shortName: "Growth", type: "agent", category: "mycology", description: "Growth pattern analysis", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "compound-analyzer", name: "Compound Analyzer", shortName: "Compound", type: "agent", category: "mycology", description: "Chemical compound analysis", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "genome-manager", name: "Genome Manager", shortName: "Genome", type: "agent", category: "mycology", description: "Genetic sequence management", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "smell-trainer", name: "Smell Trainer", shortName: "Smell", type: "agent", category: "mycology", description: "BME688 smell training", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "cultivation-advisor", name: "Cultivation Advisor", shortName: "Cultiv", type: "agent", category: "mycology", description: "Cultivation recommendations", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "bioactive-scanner", name: "Bioactive Scanner", shortName: "Bioactive", type: "agent", category: "mycology", description: "Bioactive compound detection", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "medicinal-assessor", name: "Medicinal Assessor", shortName: "Medicinal", type: "agent", category: "mycology", description: "Medicinal property assessment", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "ecosystem-modeler", name: "Ecosystem Modeler", shortName: "Ecosystem", type: "agent", category: "mycology", description: "Ecological relationship modeling", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "climate-correlator", name: "Climate Correlator", shortName: "Climate", type: "agent", category: "mycology", description: "Climate impact analysis", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "substrate-recommender", name: "Substrate Recommender", shortName: "Substrate", type: "agent", category: "mycology", description: "Substrate optimization", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "contamination-detector", name: "Contamination Detector", shortName: "Contam", type: "agent", category: "mycology", description: "Contamination identification", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "harvest-timer", name: "Harvest Timer", shortName: "Harvest", type: "agent", category: "mycology", description: "Optimal harvest timing", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// RESEARCH AGENTS (15)
// ============================================
const RESEARCH_AGENTS: AgentDefinition[] = [
  { id: "research-coordinator", name: "Research Coordinator", shortName: "Research", type: "agent", category: "research", description: "Research project coordination", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "pubmed-scraper", name: "PubMed Scraper", shortName: "PubMed", type: "agent", category: "research", description: "PubMed publication scraping", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scholar-scraper", name: "Scholar Scraper", shortName: "Scholar", type: "agent", category: "research", description: "Google Scholar integration", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "mycobank-sync", name: "MycoBank Sync", shortName: "MycoBank", type: "agent", category: "research", description: "MycoBank data synchronization", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "inaturalist-sync", name: "iNaturalist Sync", shortName: "iNat", type: "agent", category: "research", description: "iNaturalist observations", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "gbif-sync", name: "GBIF Sync", shortName: "GBIF", type: "agent", category: "research", description: "GBIF occurrence data", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "literature-summarizer", name: "Literature Summarizer", shortName: "LitSum", type: "agent", category: "research", description: "Paper summarization", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "citation-manager", name: "Citation Manager", shortName: "Citation", type: "agent", category: "research", description: "Citation tracking", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "hypothesis-generator", name: "Hypothesis Generator", shortName: "Hypoth", type: "agent", category: "research", description: "Research hypothesis generation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "methodology-advisor", name: "Methodology Advisor", shortName: "Method", type: "agent", category: "research", description: "Research methodology suggestions", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "data-validator", name: "Data Validator", shortName: "DataVal", type: "agent", category: "research", description: "Research data validation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "peer-review-assistant", name: "Peer Review Assistant", shortName: "PeerRev", type: "agent", category: "research", description: "Peer review assistance", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "grant-tracker", name: "Grant Tracker", shortName: "Grants", type: "agent", category: "research", description: "Grant application tracking", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "collaboration-finder", name: "Collaboration Finder", shortName: "Collab", type: "agent", category: "research", description: "Research collaboration matching", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "trend-analyzer", name: "Trend Analyzer", shortName: "Trends", type: "agent", category: "research", description: "Research trend analysis", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// DAO AGENTS (40)
// ============================================
const DAO_AGENTS: AgentDefinition[] = [
  { id: "dao-orchestrator", name: "DAO Orchestrator", shortName: "DAO", type: "agent", category: "dao", description: "Central DAO coordination", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "governance", name: "Governance Agent", shortName: "Gov", type: "agent", category: "dao", description: "Proposal management", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "voting", name: "Voting Agent", shortName: "Vote", type: "agent", category: "dao", description: "Vote processing", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "treasury-dao", name: "DAO Treasury", shortName: "DAOTreas", type: "agent", category: "dao", description: "DAO treasury management", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "token-manager", name: "Token Manager", shortName: "Tokens", type: "agent", category: "dao", description: "Token distribution", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "staking", name: "Staking Agent", shortName: "Stake", type: "agent", category: "dao", description: "Staking mechanics", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "rewards", name: "Rewards Agent", shortName: "Rewards", type: "agent", category: "dao", description: "Reward distribution", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "proposal-creator", name: "Proposal Creator", shortName: "Proposal", type: "agent", category: "dao", description: "Proposal generation", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "quorum-tracker", name: "Quorum Tracker", shortName: "Quorum", type: "agent", category: "dao", description: "Quorum monitoring", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "delegate-manager", name: "Delegate Manager", shortName: "Delegate", type: "agent", category: "dao", description: "Delegation management", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "ip-tokenization", name: "IP Tokenization", shortName: "IPToken", type: "agent", category: "dao", description: "IP asset tokenization", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nft-minter", name: "NFT Minter", shortName: "NFT", type: "agent", category: "dao", description: "NFT creation", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "royalty-distributor", name: "Royalty Distributor", shortName: "Royalty", type: "agent", category: "dao", description: "Royalty payments", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "contributor-tracker", name: "Contributor Tracker", shortName: "Contrib", type: "agent", category: "dao", description: "Contribution tracking", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "reputation-scorer", name: "Reputation Scorer", shortName: "Rep", type: "agent", category: "dao", description: "Reputation scoring", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "dispute-resolver", name: "Dispute Resolver", shortName: "Dispute", type: "agent", category: "dao", description: "Dispute resolution", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "multisig-coordinator", name: "Multisig Coordinator", shortName: "MultiSig", type: "agent", category: "dao", description: "Multi-signature coordination", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "timelock-manager", name: "Timelock Manager", shortName: "Timelock", type: "agent", category: "dao", description: "Timelock operations", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "snapshot-taker", name: "Snapshot Taker", shortName: "Snapshot", type: "agent", category: "dao", description: "Governance snapshots", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "forum-moderator", name: "Forum Moderator", shortName: "Forum", type: "agent", category: "dao", description: "Forum moderation", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  // DAO Worker agents 1-20
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `dao-worker-${i + 1}`,
    name: `DAO Worker ${i + 1}`,
    shortName: `DW${i + 1}`,
    type: "agent" as NodeType,
    category: "dao" as NodeCategory,
    description: `Generic DAO worker agent ${i + 1}`,
    defaultStatus: "active" as NodeStatus,
    priority: 4,
    canStart: true,
    canStop: true,
    canRestart: true,
    canConfigure: false,
  })),
]

// ============================================
// COMMUNICATION AGENTS (10)
// ============================================
const COMMUNICATION_AGENTS: AgentDefinition[] = [
  { id: "voice", name: "Voice Agent", shortName: "Voice", type: "agent", category: "communication", description: "Voice via ElevenLabs/Whisper", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "email", name: "Email Agent", shortName: "Email", type: "agent", category: "communication", description: "Email automation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "sms", name: "SMS Agent", shortName: "SMS", type: "agent", category: "communication", description: "SMS via Twilio", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "slack", name: "Slack Agent", shortName: "Slack", type: "integration", category: "communication", description: "Slack integration", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "discord", name: "Discord Agent", shortName: "Discord", type: "integration", category: "communication", description: "Discord bot", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "telegram", name: "Telegram Agent", shortName: "Telegram", type: "integration", category: "communication", description: "Telegram bot", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "notification-router", name: "Notification Router", shortName: "Notif", type: "service", category: "communication", description: "Multi-channel routing", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "push", name: "Push Agent", shortName: "Push", type: "agent", category: "communication", description: "Push notifications", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "social-media", name: "Social Media Agent", shortName: "Social", type: "agent", category: "communication", description: "Social media posting", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "newsletter", name: "Newsletter Agent", shortName: "Newsletter", type: "agent", category: "communication", description: "Newsletter generation", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// DATA AGENTS (30)
// ============================================
const DATA_AGENTS: AgentDefinition[] = [
  { id: "mindex", name: "MINDEX Agent", shortName: "MINDEX", type: "database", category: "data", description: "MINDEX database agent", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "etl-orchestrator", name: "ETL Orchestrator", shortName: "ETL", type: "agent", category: "data", description: "ETL job coordination", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "search", name: "Search Agent", shortName: "Search", type: "service", category: "data", description: "Multi-source search", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "analytics", name: "Analytics Agent", shortName: "Analytics", type: "agent", category: "data", description: "Business intelligence", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "knowledge-graph", name: "Knowledge Graph", shortName: "KnGraph", type: "database", category: "data", description: "Knowledge graph maintenance", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "vector-store", name: "Vector Store", shortName: "Qdrant", type: "database", category: "data", description: "Qdrant embeddings", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-inat", name: "iNaturalist Scraper", shortName: "iNatScr", type: "agent", category: "data", description: "iNaturalist scraper", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-mycobank", name: "MycoBank Scraper", shortName: "MBScr", type: "agent", category: "data", description: "MycoBank scraper", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-gbif", name: "GBIF Scraper", shortName: "GBIFScr", type: "agent", category: "data", description: "GBIF scraper", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-theyeasts", name: "TheYeasts Scraper", shortName: "YeastScr", type: "agent", category: "data", description: "TheYeasts.org scraper", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-fusarium", name: "Fusarium Scraper", shortName: "FuScr", type: "agent", category: "data", description: "Fusarium.org scraper", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-mushroom-world", name: "Mushroom World Scraper", shortName: "MWScr", type: "agent", category: "data", description: "Mushroom.World scraper", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-fungidb", name: "FungiDB Scraper", shortName: "FungiScr", type: "agent", category: "data", description: "FungiDB scraper", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-index-fungorum", name: "Index Fungorum Scraper", shortName: "IFScr", type: "agent", category: "data", description: "Index Fungorum scraper", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-wikipedia", name: "Wikipedia Scraper", shortName: "WikiScr", type: "agent", category: "data", description: "Wikipedia trait extraction", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scraper-ncbi", name: "NCBI Scraper", shortName: "NCBIScr", type: "agent", category: "data", description: "NCBI GenBank scraper", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "data-cleaner", name: "Data Cleaner", shortName: "Cleaner", type: "agent", category: "data", description: "Data quality cleanup", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "deduplicator", name: "Deduplicator", shortName: "Dedup", type: "agent", category: "data", description: "Duplicate detection", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "normalizer", name: "Normalizer", shortName: "Norm", type: "agent", category: "data", description: "Data normalization", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "enricher", name: "Enricher", shortName: "Enrich", type: "agent", category: "data", description: "Data enrichment", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "validator", name: "Validator", shortName: "Valid", type: "agent", category: "data", description: "Schema validation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "migrator", name: "Migrator", shortName: "Migrate", type: "agent", category: "data", description: "Data migration", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "backup", name: "Backup Agent", shortName: "Backup", type: "agent", category: "data", description: "Database backup", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "archiver", name: "Archiver", shortName: "Archive", type: "agent", category: "data", description: "Data archival", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "indexer", name: "Indexer", shortName: "Index", type: "agent", category: "data", description: "Search indexing", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "cache-manager", name: "Cache Manager", shortName: "Cache", type: "service", category: "data", description: "Redis cache management", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "stream-processor", name: "Stream Processor", shortName: "Stream", type: "agent", category: "data", description: "Real-time data streams", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "aggregator", name: "Aggregator", shortName: "Agg", type: "agent", category: "data", description: "Data aggregation", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "exporter", name: "Exporter", shortName: "Export", type: "agent", category: "data", description: "Data export (CSV, JSON)", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "importer", name: "Importer", shortName: "Import", type: "agent", category: "data", description: "Bulk data import", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// INFRASTRUCTURE AGENTS (15)
// ============================================
const INFRASTRUCTURE_AGENTS: AgentDefinition[] = [
  { id: "docker-manager", name: "Docker Manager", shortName: "Docker", type: "service", category: "infrastructure", description: "Container orchestration", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "proxmox-manager", name: "Proxmox Manager", shortName: "Proxmox", type: "service", category: "infrastructure", description: "VM management", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "network", name: "Network Agent", shortName: "Network", type: "service", category: "infrastructure", description: "UniFi network integration", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "storage-nas", name: "NAS Storage Agent", shortName: "NAS", type: "service", category: "infrastructure", description: "NAS management", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "storage-cloud", name: "Cloud Storage Agent", shortName: "Cloud", type: "service", category: "infrastructure", description: "Cloud storage (S3, GCS)", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "dns", name: "DNS Agent", shortName: "DNS", type: "service", category: "infrastructure", description: "DNS management", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "ssl", name: "SSL Agent", shortName: "SSL", type: "service", category: "infrastructure", description: "SSL certificate management", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "load-balancer", name: "Load Balancer", shortName: "LB", type: "service", category: "infrastructure", description: "Traffic distribution", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "backup-infra", name: "Infrastructure Backup", shortName: "InfraBak", type: "agent", category: "infrastructure", description: "Infrastructure backup", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "monitoring", name: "Monitoring Agent", shortName: "Monitor", type: "service", category: "infrastructure", description: "Prometheus/Grafana", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "alerting", name: "Alerting Agent", shortName: "Alert", type: "service", category: "infrastructure", description: "Alert management", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scaling", name: "Scaling Agent", shortName: "Scale", type: "service", category: "infrastructure", description: "Auto-scaling", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "deployment", name: "Deployment Agent", shortName: "Deploy", type: "service", category: "infrastructure", description: "CI/CD deployment", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "resource-optimizer", name: "Resource Optimizer", shortName: "ResOpt", type: "agent", category: "infrastructure", description: "Resource optimization", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "cost-tracker", name: "Cost Tracker", shortName: "Cost", type: "agent", category: "infrastructure", description: "Infrastructure costs", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// SIMULATION AGENTS (12)
// ============================================
const SIMULATION_AGENTS: AgentDefinition[] = [
  { id: "earth-simulator", name: "Earth Simulator", shortName: "Earth", type: "agent", category: "simulation", description: "NatureOS Earth simulation", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "petri-dish", name: "Petri Dish Simulator", shortName: "Petri", type: "agent", category: "simulation", description: "Petri dish simulation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "mushroom-growth", name: "Mushroom Growth Sim", shortName: "GrowthSim", type: "agent", category: "simulation", description: "Mushroom growth simulation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "compound-sim", name: "Compound Simulator", shortName: "CompSim", type: "agent", category: "simulation", description: "Compound behavior simulation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "genetic-sim", name: "Genetic Simulator", shortName: "GeneSim", type: "agent", category: "simulation", description: "Genetic phenotype simulation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "antiviral-sim", name: "Antiviral Simulator", shortName: "AntiVSim", type: "agent", category: "simulation", description: "Antiviral efficacy simulation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "antibacterial-sim", name: "Antibacterial Simulator", shortName: "AntiBSim", type: "agent", category: "simulation", description: "Antibacterial efficacy simulation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "antifungal-sim", name: "Antifungal Simulator", shortName: "AntiFSim", type: "agent", category: "simulation", description: "Antifungal efficacy simulation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "protein-sim", name: "Protein Simulator", shortName: "ProSim", type: "agent", category: "simulation", description: "Protein folding simulation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "amino-acid-sim", name: "Amino Acid Simulator", shortName: "AASim", type: "agent", category: "simulation", description: "Amino acid interaction", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "climate-sim", name: "Climate Simulator", shortName: "ClimateSim", type: "agent", category: "simulation", description: "Climate impact simulation", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "ecosystem-sim", name: "Ecosystem Simulator", shortName: "EcoSim", type: "agent", category: "simulation", description: "Ecosystem dynamics simulation", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// SECURITY AGENTS (8)
// ============================================
const SECURITY_AGENTS: AgentDefinition[] = [
  { id: "auth", name: "Auth Agent", shortName: "Auth", type: "service", category: "security", description: "Authentication", defaultStatus: "active", priority: 10, canStart: true, canStop: false, canRestart: true, canConfigure: true },
  { id: "authorization", name: "Authorization Agent", shortName: "Authz", type: "service", category: "security", description: "Access control", defaultStatus: "active", priority: 10, canStart: true, canStop: false, canRestart: true, canConfigure: true },
  { id: "watchdog", name: "Watchdog Agent", shortName: "Watchdog", type: "agent", category: "security", description: "Threat monitoring", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "hunter", name: "Hunter Agent", shortName: "Hunter", type: "agent", category: "security", description: "Threat hunting", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "guardian", name: "Guardian Agent", shortName: "Guardian", type: "agent", category: "security", description: "System protection", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "compliance", name: "Compliance Agent", shortName: "Comply", type: "agent", category: "security", description: "Regulatory compliance", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "audit", name: "Audit Agent", shortName: "Audit", type: "agent", category: "security", description: "Security audit logs", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "incident-response", name: "Incident Response Agent", shortName: "IR", type: "agent", category: "security", description: "Incident handling", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// INTEGRATION AGENTS (20)
// ============================================
const INTEGRATION_AGENTS: AgentDefinition[] = [
  { id: "n8n", name: "n8n Agent", shortName: "n8n", type: "integration", category: "integration", description: "n8n workflow orchestration", defaultStatus: "active", priority: 9, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "github", name: "GitHub Agent", shortName: "GitHub", type: "integration", category: "integration", description: "GitHub integration", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "notion", name: "Notion Agent", shortName: "Notion", type: "integration", category: "integration", description: "Notion knowledge base", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "google-drive", name: "Google Drive Agent", shortName: "GDrive", type: "integration", category: "integration", description: "Google Drive", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "aws", name: "AWS Agent", shortName: "AWS", type: "integration", category: "integration", description: "AWS services", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "azure", name: "Azure Agent", shortName: "Azure", type: "integration", category: "integration", description: "Azure services", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "gcp", name: "GCP Agent", shortName: "GCP", type: "integration", category: "integration", description: "Google Cloud", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "openai", name: "OpenAI Agent", shortName: "OpenAI", type: "integration", category: "integration", description: "OpenAI API", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "anthropic", name: "Anthropic Agent", shortName: "Claude", type: "integration", category: "integration", description: "Claude API", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "grok", name: "Grok Agent", shortName: "Grok", type: "integration", category: "integration", description: "xAI Grok API", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "elevenlabs", name: "ElevenLabs Agent", shortName: "11Labs", type: "integration", category: "integration", description: "Voice synthesis", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "whisper", name: "Whisper Agent", shortName: "Whisper", type: "integration", category: "integration", description: "Speech recognition", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "mapbox", name: "Mapbox Agent", shortName: "Mapbox", type: "integration", category: "integration", description: "Mapping services", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "weather-api", name: "Weather API Agent", shortName: "Weather", type: "integration", category: "integration", description: "Weather data", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "unifi", name: "UniFi Agent", shortName: "UniFi", type: "integration", category: "integration", description: "UniFi integration", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "palantir", name: "Palantir Agent", shortName: "Palantir", type: "integration", category: "integration", description: "Palantir Foundry", defaultStatus: "offline", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "snowflake", name: "Snowflake Agent", shortName: "Snowflake", type: "integration", category: "integration", description: "Snowflake data", defaultStatus: "offline", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "databricks", name: "Databricks Agent", shortName: "DBricks", type: "integration", category: "integration", description: "Databricks ML", defaultStatus: "offline", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "supabase", name: "Supabase Agent", shortName: "Supabase", type: "integration", category: "integration", description: "Supabase services", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "webhook-handler", name: "Webhook Handler", shortName: "Webhook", type: "integration", category: "integration", description: "Generic webhooks", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// DEVICE AGENTS (18)
// ============================================
const DEVICE_AGENTS: AgentDefinition[] = [
  { id: "mycobrain", name: "MycoBrain Agent", shortName: "MycoBrain", type: "device", category: "device", description: "MycoBrain management", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "mycobrain-side-a", name: "MycoBrain Side A", shortName: "BrainA", type: "device", category: "device", description: "Sensor MCU control", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "mycobrain-side-b", name: "MycoBrain Side B", shortName: "BrainB", type: "device", category: "device", description: "Router MCU control", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "device-discovery", name: "Device Discovery", shortName: "Discovery", type: "service", category: "device", description: "Device discovery", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "device-registry", name: "Device Registry", shortName: "DevReg", type: "service", category: "device", description: "Device registration", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "firmware-manager", name: "Firmware Manager", shortName: "Firmware", type: "service", category: "device", description: "OTA firmware updates", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "telemetry-collector", name: "Telemetry Collector", shortName: "Telemetry", type: "agent", category: "device", description: "Sensor data collection", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "command-dispatcher", name: "Command Dispatcher", shortName: "CmdDisp", type: "service", category: "device", description: "Device commands", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "sensor-bme688", name: "BME688 Sensor Agent", shortName: "BME688", type: "device", category: "device", description: "BME688 sensor agent", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "sensor-bme690", name: "BME690 Sensor Agent", shortName: "BME690", type: "device", category: "device", description: "BME690 sensor agent", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "lora-gateway", name: "LoRa Gateway", shortName: "LoRa", type: "device", category: "device", description: "LoRa communication", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "wifi-sense", name: "WiFi Sense Agent", shortName: "WiFiSense", type: "device", category: "device", description: "WiFi CSI sensing", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "optical-modem", name: "Optical Modem Agent", shortName: "Optical", type: "device", category: "device", description: "Optical communication", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "acoustic-modem", name: "Acoustic Modem Agent", shortName: "Acoustic", type: "device", category: "device", description: "Acoustic communication", defaultStatus: "active", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "myco-drone", name: "MycoDRONE Agent", shortName: "Drone", type: "device", category: "device", description: "MycoDRONE control", defaultStatus: "offline", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "camera", name: "Camera Agent", shortName: "Camera", type: "device", category: "device", description: "Camera integration", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "spectrometer", name: "Spectrometer Agent", shortName: "Spectro", type: "device", category: "device", description: "Spectrometer control", defaultStatus: "offline", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "microscope", name: "Microscope Agent", shortName: "Micro", type: "device", category: "device", description: "Microscope automation", defaultStatus: "offline", priority: 5, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// CHEMISTRY AGENTS (8)
// ============================================
const CHEMISTRY_AGENTS: AgentDefinition[] = [
  { id: "chemspider-sync", name: "ChemSpider Sync", shortName: "ChemSpi", type: "agent", category: "chemistry", description: "Syncs compound data from ChemSpider API", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "compound-enricher", name: "Compound Enricher", shortName: "CompEnr", type: "agent", category: "chemistry", description: "Enriches compounds with external data sources", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "compound-analyzer-chem", name: "Compound Analyzer (Chem)", shortName: "CompAn", type: "agent", category: "chemistry", description: "Analyzes compound properties and activities", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "sar-analyzer", name: "SAR Analyzer", shortName: "SAR", type: "agent", category: "chemistry", description: "Structure-Activity Relationship analysis", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "protein-folder", name: "Protein Folder", shortName: "ProFold", type: "agent", category: "chemistry", description: "Protein folding predictions (AlphaFold)", defaultStatus: "offline", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "peptide-analyzer", name: "Peptide Analyzer", shortName: "Peptide", type: "agent", category: "chemistry", description: "Peptide sequence analysis", defaultStatus: "offline", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "chemical-sim", name: "Chemical Simulator", shortName: "ChemSim", type: "agent", category: "chemistry", description: "Chemical simulation engine", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "bioactivity-predictor", name: "Bioactivity Predictor", shortName: "BioAct", type: "agent", category: "chemistry", description: "Predicts biological activity from structure", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// NLM AGENTS (20)
// ============================================
const NLM_AGENTS: AgentDefinition[] = [
  { id: "nlm-trainer", name: "NLM Trainer", shortName: "NLMTrain", type: "agent", category: "nlm", description: "Model training orchestration", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-embedder", name: "NLM Embedder", shortName: "NLMEmb", type: "agent", category: "nlm", description: "Species embedding generation", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-classifier", name: "NLM Classifier", shortName: "NLMClass", type: "agent", category: "nlm", description: "Classification inference", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-image", name: "NLM Image", shortName: "NLMImg", type: "agent", category: "nlm", description: "Image recognition", defaultStatus: "active", priority: 8, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-smell", name: "NLM Smell", shortName: "NLMSmell", type: "agent", category: "nlm", description: "Smell classification", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-growth", name: "NLM Growth", shortName: "NLMGrowth", type: "agent", category: "nlm", description: "Growth prediction", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-phylogeny", name: "NLM Phylogeny", shortName: "NLMPhylo", type: "agent", category: "nlm", description: "Evolutionary inference", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-feedback", name: "NLM Feedback", shortName: "NLMFeed", type: "agent", category: "nlm", description: "User feedback processing", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-validator", name: "NLM Validator", shortName: "NLMValid", type: "agent", category: "nlm", description: "Model validation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-optimizer", name: "NLM Optimizer", shortName: "NLMOpt", type: "agent", category: "nlm", description: "Hyperparameter tuning", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-deployer", name: "NLM Deployer", shortName: "NLMDep", type: "agent", category: "nlm", description: "Model deployment", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-monitor", name: "NLM Monitor", shortName: "NLMMon", type: "agent", category: "nlm", description: "Model performance monitoring", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-explainer", name: "NLM Explainer", shortName: "NLMExp", type: "agent", category: "nlm", description: "Model explainability", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-data-curator", name: "NLM Data Curator", shortName: "NLMCurate", type: "agent", category: "nlm", description: "Training data curation", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-augmenter", name: "NLM Augmenter", shortName: "NLMAug", type: "agent", category: "nlm", description: "Data augmentation", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-synthetic", name: "NLM Synthetic", shortName: "NLMSynth", type: "agent", category: "nlm", description: "Synthetic data generation", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-transfer", name: "NLM Transfer", shortName: "NLMTrans", type: "agent", category: "nlm", description: "Transfer learning", defaultStatus: "active", priority: 7, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-ensemble", name: "NLM Ensemble", shortName: "NLMEns", type: "agent", category: "nlm", description: "Model ensembling", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-edge", name: "NLM Edge", shortName: "NLMEdge", type: "agent", category: "nlm", description: "Edge model optimization", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "nlm-continual", name: "NLM Continual", shortName: "NLMCont", type: "agent", category: "nlm", description: "Continual learning", defaultStatus: "active", priority: 6, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// ============================================
// SPECIAL NODES (Services & User)
// ============================================
const SPECIAL_NODES: AgentDefinition[] = [
  { id: "user-morgan", name: "Morgan (User)", shortName: "Morgan", type: "user", category: "core", description: "Primary system user", defaultStatus: "active", priority: 10, canStart: false, canStop: false, canRestart: false, canConfigure: false },
  { id: "redis", name: "Redis Cache", shortName: "Redis", type: "database", category: "infrastructure", description: "Redis cache service", defaultStatus: "active", priority: 9, canStart: true, canStop: false, canRestart: true, canConfigure: true },
  { id: "postgresql", name: "PostgreSQL", shortName: "PG", type: "database", category: "infrastructure", description: "PostgreSQL database", defaultStatus: "active", priority: 10, canStart: true, canStop: false, canRestart: true, canConfigure: true },
  { id: "qdrant-service", name: "Qdrant Vector DB", shortName: "Qdrant", type: "database", category: "infrastructure", description: "Qdrant vector database service", defaultStatus: "active", priority: 9, canStart: true, canStop: false, canRestart: true, canConfigure: true },
]

// ============================================
// COMPLETE REGISTRY
// ============================================
export const COMPLETE_AGENT_REGISTRY: AgentDefinition[] = [
  ...CORE_AGENTS,
  ...FINANCIAL_AGENTS,
  ...MYCOLOGY_AGENTS,
  ...RESEARCH_AGENTS,
  ...DAO_AGENTS,
  ...COMMUNICATION_AGENTS,
  ...DATA_AGENTS,
  ...INFRASTRUCTURE_AGENTS,
  ...SIMULATION_AGENTS,
  ...SECURITY_AGENTS,
  ...INTEGRATION_AGENTS,
  ...DEVICE_AGENTS,
  ...CHEMISTRY_AGENTS,
  ...NLM_AGENTS,
  ...SPECIAL_NODES,
]

// Category statistics
export const CATEGORY_STATS: Record<NodeCategory, { count: number; description: string }> = {
  core: { count: CORE_AGENTS.length + 1, description: "Orchestration, memory, routing" },
  financial: { count: FINANCIAL_AGENTS.length, description: "Banking, payments, treasury" },
  mycology: { count: MYCOLOGY_AGENTS.length, description: "Species, taxonomy, traits" },
  research: { count: RESEARCH_AGENTS.length, description: "Publications, synthesis, analysis" },
  dao: { count: DAO_AGENTS.length, description: "Governance, voting, treasury" },
  communication: { count: COMMUNICATION_AGENTS.length, description: "Voice, email, social" },
  data: { count: DATA_AGENTS.length, description: "ETL, scrapers, enrichment" },
  infrastructure: { count: INFRASTRUCTURE_AGENTS.length + 3, description: "Devices, network, storage" },
  simulation: { count: SIMULATION_AGENTS.length, description: "Growth, compounds, genetics" },
  security: { count: SECURITY_AGENTS.length, description: "Auth, watchdog, compliance" },
  integration: { count: INTEGRATION_AGENTS.length, description: "APIs, webhooks, services" },
  device: { count: DEVICE_AGENTS.length, description: "MycoBrain, sensors, drones" },
  chemistry: { count: CHEMISTRY_AGENTS.length, description: "ChemSpider, compounds, SAR" },
  nlm: { count: NLM_AGENTS.length, description: "Training, inference, feedback" },
}

// Total agent count
export const TOTAL_AGENT_COUNT = COMPLETE_AGENT_REGISTRY.length

// Helper functions
export function getAgentById(id: string): AgentDefinition | undefined {
  return COMPLETE_AGENT_REGISTRY.find((a) => a.id === id)
}

export function getAgentsByCategory(category: NodeCategory): AgentDefinition[] {
  return COMPLETE_AGENT_REGISTRY.filter((a) => a.category === category)
}

export function getActiveAgents(): AgentDefinition[] {
  return COMPLETE_AGENT_REGISTRY.filter((a) => a.defaultStatus === "active")
}

// Category heads - first agent in each category or designated lead
const CATEGORY_HEADS: Record<NodeCategory, string> = {
  core: "myca-orchestrator",
  financial: "financial",
  mycology: "mycology-bio",
  research: "research-coordinator",
  dao: "dao-orchestrator",
  communication: "voice",
  data: "mindex",
  infrastructure: "docker-manager",
  simulation: "earth-simulator",
  security: "auth",
  integration: "n8n",
  device: "mycobrain",
  chemistry: "chemspider-sync",
  nlm: "nlm-trainer",
}

// Default connections - ensures ALL agents are connected to the orchestrator
// via their category heads, creating a fully connected topology
export function generateDefaultConnections(): Array<{ source: string; target: string }> {
  const connections: Array<{ source: string; target: string }> = []
  const added = new Set<string>()
  
  const addConnection = (source: string, target: string) => {
    const key = [source, target].sort().join("--")
    if (!added.has(key) && source !== target) {
      added.add(key)
      connections.push({ source, target })
    }
  }

  // User to Orchestrator
  addConnection("user-morgan", "myca-orchestrator")

  // Orchestrator to all core services
  CORE_AGENTS.forEach((agent) => {
    if (agent.id !== "myca-orchestrator") {
      addConnection("myca-orchestrator", agent.id)
    }
  })

  // Orchestrator to ALL category heads
  Object.values(CATEGORY_HEADS).forEach((head) => {
    if (head !== "myca-orchestrator") {
      addConnection("myca-orchestrator", head)
    }
  })

  // Connect EVERY agent to their category head
  // This ensures all agents have at least one connection to core systems
  COMPLETE_AGENT_REGISTRY.forEach((agent) => {
    const categoryHead = CATEGORY_HEADS[agent.category]
    
    // Skip if this agent IS the category head
    if (agent.id === categoryHead) return
    
    // Skip core agents (already connected to orchestrator)
    if (agent.category === "core") return
    
    // Connect to category head
    if (categoryHead) {
      addConnection(agent.id, categoryHead)
    }
  })

  // Core services to databases
  addConnection("memory-manager", "redis")
  addConnection("memory-manager", "postgresql")
  addConnection("memory-manager", "qdrant-service")
  addConnection("vector-store", "qdrant-service")
  addConnection("mindex", "postgresql")
  addConnection("cache-manager", "redis")
  
  // Additional infrastructure connections
  addConnection("postgresql", "myca-orchestrator")
  addConnection("redis", "myca-orchestrator")
  addConnection("qdrant-service", "myca-orchestrator")
  
  // Integration agents to data sources
  addConnection("n8n", "postgresql")
  addConnection("n8n", "redis")
  addConnection("mycobrain", "qdrant-service")
  
  return connections
}
