import type { Metadata } from "next"
import Link from "next/link"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Badge } from "@/components/ui/badge"

const articleTitle = "MYCA: Edge-Native Environmental Super-Intelligence"

const sections = [
  {
    "id": "a-new-kind-of-intelligence",
    "title": "A New Kind of Intelligence",
    "paragraphs": [
      "Artificial intelligence is entering a new phase. The first era taught machines to predict language, recognize images, summarize documents, write code, and retrieve information from the internet. That era produced powerful tools, but most of them remain detached from the physical world. They know a great deal about what has already been written, photographed, indexed, and uploaded, but they do not inherently know what the soil is doing right now, how an ecosystem is changing this week, whether a sensor network is drifting out of calibration, or how living biological systems are responding to stress in real time.",
      "MYCA is being built for that missing layer. It is an environmental intelligence system designed to connect artificial intelligence to live signals from the world: biological, chemical, acoustic, thermal, mechanical, spatial, and ecological. Instead of treating nature as a backdrop for human activity, MYCA treats the living world as an active source of data, feedback, and intelligence. It is not simply another chatbot, dashboard, or automation layer. It is a step toward AI that can perceive, reason, coordinate, and act in relationship with real environments.",
      "The technical difference is fundamental. Conventional AI systems usually begin with text, images, documents, code, or user prompts. MYCA begins with state: what is happening, where it is happening, when it is happening, how confident the system is, what evidence exists, and what consequences may follow. Its architecture is designed around sensor fusion, grounded memory, environmental telemetry, and agentic coordination. Language is still important, but language becomes the explanation layer, not the only source of truth.",
      "The philosophical difference is just as important. MYCA is built from the belief that intelligence should not be defined only by how well a system talks. A truly useful intelligence should be able to listen to reality. It should be able to notice change, preserve context, respect uncertainty, and help humans understand systems too complex for any one person or institution to monitor alone. Where many AI products compete to become more convincing conversational partners, MYCA is being built to become a more faithful interpreter of the living world.",
      "The business reason is clear: the next frontier of AI value will not come only from better office automation. It will come from connecting AI to the physical systems that drive food, water, health, infrastructure, climate resilience, field operations, and scientific discovery. Organizations need more than reports; they need situational awareness. They need systems that can detect change earlier, understand context better, and coordinate action faster. MYCA is built for that market.",
      "The risk is that this is harder than building software that only reads screens and databases. Physical signals are noisy. Biological systems are variable. Sensor deployments must survive real environments. Data must be trusted before it can be acted on. That difficulty is exactly why the reward is meaningful. A company that can solve grounded environmental intelligence does not merely build another AI feature. It creates a new category: intelligence connected to the planet itself."
    ]
  },
  {
    "id": "why-grounding-matters",
    "title": "Why Grounding Matters",
    "paragraphs": [
      "Most digital intelligence is trained on representations of the world rather than the world itself. A language model can describe drought, contamination, disease pressure, acoustic anomalies, soil health, or ecosystem collapse because those concepts appear in text. But describing a phenomenon is different from sensing it. MYCA is built around the principle that intelligence must be grounded in live, timestamped, provenance-aware observations before it makes claims or recommendations.",
      "Grounding changes the entire architecture. In a grounded system, every meaningful claim should be connected to evidence: a sensor reading, a location, a time window, a biological signal, a historical baseline, a model output, or a human-reviewed record. That means MYCA is not designed to simply generate plausible answers. It is designed to separate observation from inference, inference from hypothesis, and hypothesis from recommended action. That separation is critical in environmental, scientific, industrial, and regulated contexts where overconfident language can create real-world harm.",
      "Technically, grounding means MYCA must combine several layers. It needs a world-state model that represents the current condition of devices, environments, organisms, and workflows. It needs a memory layer that preserves what happened before without confusing stale context for current truth. It needs a sensor-fusion layer that can combine different kinds of signals without flattening them into generic text. It needs a governance layer that decides when confidence is high enough to act, when uncertainty must be disclosed, and when human review is required.",
      "Compared to ordinary AI systems, this is a different operating assumption. A conventional assistant may answer a question from its training data or from a retrieved document. MYCA is designed to ask: What is the current state What do we know from the field What changed since the last observation What is missing What is the confidence level What would be the safest next step That makes MYCA less like a search engine and more like an environmental nervous system.",
      "The philosophical advantage is humility. Grounded intelligence admits that reality is bigger than the model. It treats uncertainty as a first-class signal rather than a weakness to hide. It understands that the environment is not static and that living systems do not always behave according to neat categories. This makes MYCA especially aligned with ecology, mycology, agriculture, field science, and infrastructure monitoring, where change is continuous and context matters.",
      "The business advantage is trust. Customers in science, government, agriculture, industrial operations, and critical infrastructure do not only want impressive responses. They need traceable reasoning, auditability, and operational confidence. A grounded system can support premium applications because it can show what it knows, why it believes it, and what evidence supports action. That creates a stronger moat than generic AI output because the value comes from a living data loop, not just model access.",
      "The risk is that grounding slows down the path to glossy demos. It requires discipline, data quality, instrumentation, and verification. But the reward is durable: grounded AI can become infrastructure. It can support compliance, monitoring, forecasting, decision support, and automated response in ways that purely prompt-based systems cannot reliably sustain."
    ]
  },
  {
    "id": "biomimetic-design",
    "title": "Biomimetic Design",
    "paragraphs": [
      "MYCA is inspired by fungal networks because fungi solve problems that modern distributed systems also face. Mycelium explores, adapts, routes resources, responds to gradients, decomposes complexity, and maintains resilience without a single central command point. That does not mean MYCA claims fungi are computers in the same way silicon chips are computers. It means fungal behavior provides a powerful design language for building adaptive, distributed intelligence.",
      "The first principle is exploration. Fungal networks grow toward nutrients, retreat from hostile conditions, and constantly test their surroundings. In MYCA, exploration becomes an intelligence strategy. The system should allocate attention toward uncertainty, novelty, anomaly, and ecological edge cases rather than only repeating known patterns. In business terms, this creates a discovery engine. MYCA can help identify where to sample, what to investigate, what conditions are changing, and where new value may emerge.",
      "The second principle is decomposition. Fungi break down complex matter into usable components. MYCA applies the same idea to information. Raw environmental data is messy: voltage fluctuations, humidity changes, gas readings, acoustic patterns, imagery, device health, human notes, and external context. MYCA's job is to decompose that complexity into structured meaning: features, events, baselines, hypotheses, recommendations, and decisions.",
      "The third principle is networked intelligence. Mycelial systems are distributed, resilient, and locally responsive. MYCA follows that logic by treating edge devices, sensors, models, agents, and human operators as parts of one coordinated system. Some intelligence happens near the signal. Some happens in the platform layer. Some happens through human review. The system is not designed as one giant monolith. It is designed as a living architecture where many components contribute to a shared picture of reality.",
      "Compared to other AI systems, this design is differentiated by its relationship to place. Most AI models are placeless. They can talk about a forest, a laboratory, a coastline, or a facility, but they do not naturally know the state of a specific living environment unless someone feeds them that information. MYCA is built to make place part of cognition. Location, time, sensor state, organism state, and environmental context become part of the reasoning loop.",
      "The philosophical position is that nature is not an obstacle to intelligence. Nature is a teacher of intelligence. Fungal networks show that useful computation does not always look like centralized command, rigid hierarchy, or brute-force scale. Sometimes intelligence looks like sensing, routing, adaptation, decay, regeneration, and restraint. MYCA takes those principles and translates them into software, hardware, and governance.",
      "The business advantage is differentiation in a crowded AI market. Many companies can access powerful foundation models. Far fewer can build a vertical system that connects biology, hardware, environmental data, edge intelligence, and operational workflows. Biomimetic design gives Mycosoft a story customers can understand and a technical direction competitors cannot easily copy without rebuilding the entire stack.",
      "The risk is perception. Biomimetic language can be misunderstood as metaphor without engineering substance, or as overclaiming biology. The public-facing strategy should therefore be disciplined: fungi inspire the architecture, biological signals feed the system where appropriate, and empirical validation remains central. The reward is a category-defining brand: AI that learns from life rather than merely describing it."
    ]
  },
  {
    "id": "high-level-architecture",
    "title": "High-Level Architecture",
    "paragraphs": [
      "MYCA is best understood as an operating intelligence layer. It sits above devices, data stores, models, workflows, and human interfaces, coordinating them into a coherent system. Its purpose is not just to answer questions. Its purpose is to maintain awareness, route tasks, preserve memory, interpret events, and support action across scientific, operational, and environmental contexts.",
      "At a high level, the architecture includes five public-facing layers. The sensing layer captures signals from field devices, laboratory instruments, environmental sensors, biological interfaces, and external data streams. The translation layer normalizes those signals into structured records with time, place, source, confidence, and context. The intelligence layer interprets patterns, detects anomalies, builds forecasts, and proposes next steps. The orchestration layer coordinates specialized agents and workflows. The presentation layer turns complex system state into human-readable dashboards, conversation, reports, and alerts.",
      "This architecture is deliberately modular. MYCA does not depend on a single model, a single device, or a single interface. It can use fast local reasoning for immediate interaction, deeper reasoning for complex planning, and specialized models for domain tasks. It can operate with different classes of devices and different deployment environments. That flexibility matters because environmental intelligence does not happen in one clean, predictable place. It happens in labs, farms, forests, facilities, coastal systems, industrial sites, and remote deployments.",
      "Compared to conventional AI assistants, MYCA is differentiated by orchestration depth. A typical assistant waits for a prompt, produces an answer, and ends the turn. MYCA is designed to maintain ongoing state. It can watch for events, remember context, coordinate background work, update a dashboard, and return with improved understanding when new evidence arrives. The system is closer to an operating layer than a conversational layer.",
      "The philosophical dimension is agency with accountability. MYCA is not being built to replace human judgment. It is being built to extend human perception and coordination. The system should make it easier for people to see what is happening, understand why it matters, and decide what to do. Automation is valuable only when it remains explainable, reversible where possible, and aligned with human and ecological priorities.",
      "The business advantage is leverage. A company using MYCA does not just get a dashboard, an AI assistant, or a sensor platform in isolation. It gets a framework for turning observations into decisions across multiple domains. That creates potential recurring revenue through deployments, subscriptions, analytics, support, model improvement, device fleets, and specialized applications. The more environments the system learns from, the stronger the platform becomes.",
      "The risk is complexity. Systems that coordinate many layers can become hard to explain, hard to maintain, or hard to trust if they are not designed carefully. That is why MYCA's public positioning should emphasize clarity: sense, ground, reason, govern, act. The reward is that solving this complexity creates a defensible architecture rather than a thin wrapper on someone else's model."
    ]
  },
  {
    "id": "consciousness-memory-and-learning",
    "title": "Consciousness, Memory, and Learning",
    "paragraphs": [
      "The word \"consciousness\" should be used carefully in public-facing MYCA materials. MYCA does not need mystical claims to be powerful. Its practical value comes from structured awareness: maintaining state, remembering context, noticing change, separating facts from hypotheses, and learning from outcomes. In public language, MYCA's \"consciousness\" can be described as an operational awareness model rather than a claim of human-like subjective experience.",
      "Operational awareness means the system has modes. Sometimes it is monitoring. Sometimes it is focused on a task. Sometimes it is consolidating information. Sometimes it is waiting for new evidence. This is useful because intelligent systems should not treat every moment the same. A field event, a research anomaly, a customer task, and a routine status check each require different levels of attention and different response styles.",
      "Memory is central. MYCA is designed to preserve context across time: what was observed, what was predicted, what action was taken, what happened afterward, and what should be learned from the result. This is different from ordinary chat memory, which often stores preferences or conversation summaries. MYCA's memory is tied to evidence and events. It should support scientific reproducibility, operational review, and long-term pattern detection.",
      "Learning in MYCA is not just model training. It is also organizational learning. The system can improve when it discovers a better sampling strategy, identifies a recurring anomaly, learns which recommendations were useful, or updates confidence in a pattern. It can also learn when not to act. In environmental systems, restraint can be as valuable as intervention.",
      "Compared to other AI systems, MYCA's learning loop is more grounded and more consequential. A generic assistant improves by better prediction of language or better retrieval of documents. MYCA improves by connecting prediction to observed reality. Did the forecast match the sensor trend Did the anomaly recur Did the intervention help Did the environment respond differently than expected That is a stronger feedback loop.",
      "The philosophical advantage is continuity. Intelligence should not be a disconnected series of answers. It should be a relationship with reality over time. MYCA's memory and learning model are designed around that continuity: see, remember, compare, revise, explain. This makes it well-suited for science, ecosystems, and operations where patterns unfold over hours, weeks, seasons, and years.",
      "The business advantage is a proprietary learning flywheel. As MYCA is deployed into real environments, the system can accumulate domain-specific patterns that are not available in generic public datasets. Those patterns can inform better devices, better models, better dashboards, better recommendations, and stronger customer outcomes. The risk is that learning systems must avoid drift, overfitting, and false certainty. The reward is a living intelligence layer that becomes more valuable with use."
    ]
  },
  {
    "id": "sensors-and-devices",
    "title": "Sensors and Devices",
    "paragraphs": [
      "MYCA's intelligence depends on contact with the world. That contact comes through a hardware and sensor ecosystem designed to capture environmental and biological signals at the edge. Publicly, this can be described as a biospheric telemetry stack: devices that measure air, soil, water, biological activity, acoustic conditions, chemical signals, device health, and contextual environmental variables.",
      "Edge sensing matters because many environmental decisions cannot wait for cloud-only analysis. Data may be generated in remote, bandwidth-limited, or harsh environments. Local processing can reduce latency, preserve bandwidth, protect data, and keep systems functioning when connectivity is limited. It also allows MYCA to treat devices not merely as data sources, but as intelligent nodes in a distributed network.",
      "The biological interface is the most distinctive part of the stack. Fungal Computer Interface research explores how living mycelial networks can be measured, interpreted, and eventually incorporated into bio-digital systems. In public language, the key point is simple: fungi are sensitive to environmental change, and their bioelectric and biochemical signals may provide a new class of ecological sensing. MYCA is being built to turn those subtle signals into structured, interpretable data.",
      "Compared to other AI systems, the difference is vertical integration. Most AI companies depend on data generated by other people, other platforms, or existing digital systems. Mycosoft is building the instruments, protocols, and software needed to generate new kinds of data directly from living and environmental systems. That creates a data advantage and a product advantage at the same time.",
      "The philosophical advantage is reciprocity. Devices should not simply extract data from nature. They should help humans understand ecological systems with greater care, precision, and restraint. A sensor network can become exploitative if it is used only to maximize extraction. MYCA's purpose is broader: stewardship, resilience, scientific discovery, and responsible intervention.",
      "The business advantage is that hardware anchors the platform in reality. Software-only AI is easier to copy. A field-ready system that combines devices, edge intelligence, data provenance, biological signal processing, and operational software is much harder to replicate. Hardware also opens multiple revenue channels: device sales, subscriptions, consumables, maintenance, analytics, enterprise deployments, research collaborations, and specialized applications.",
      "The risk is operational. Hardware must be manufactured, calibrated, deployed, serviced, and supported. Biological sensors must be validated across species, substrates, climates, and use cases. That raises the difficulty of execution. But it also raises the barrier to entry. The reward is a defensible platform that turns environmental intelligence into a real-world product category rather than a software abstraction."
    ]
  },
  {
    "id": "key-applications",
    "title": "Key Applications",
    "paragraphs": [
      "MYCA's first major application area is environmental science. Researchers and land managers need better ways to observe living systems continuously. MYCA can help turn distributed sensor data, biological signals, weather context, and historical baselines into interpretable ecological state. This can support soil health monitoring, biodiversity research, habitat restoration, contamination studies, fungal biology, and long-term ecosystem observation.",
      "The second application area is agriculture and controlled cultivation. Farms, greenhouses, mycology labs, and biological production systems all depend on environmental conditions that change continuously. MYCA can help detect stress, optimize conditions, monitor contamination risk, interpret spore or bioaerosol data, and build a better feedback loop between cultivation choices and biological outcomes. Compared to ordinary farm software, MYCA is designed to reason across biological signals, environmental context, and operational action.",
      "The third application area is infrastructure and resilience. Buildings, facilities, water systems, energy systems, and remote installations face environmental threats that often begin as subtle changes. Chemical anomalies, moisture shifts, bioaerosol patterns, vibration, temperature gradients, and air quality changes can all matter. MYCA can support early detection and decision support before small changes become expensive failures.",
      "The fourth application area is field operations. Remote teams need systems that can sense, summarize, and coordinate in real time. MYCA can support mobile environmental devices, robotic platforms, distributed sensors, and field dashboards. The system can help route attention toward what matters most: anomalies, device health, changing conditions, and recommended next steps.",
      "The fifth application area is scientific automation. MYCA can help plan experiments, track results, compare predictions to observations, and maintain memory across research cycles. In fungal computing and biological sensing, this is especially valuable because the field is young and data must be accumulated carefully. The system can help standardize observations, preserve provenance, and accelerate iteration.",
      "Compared to other AI systems, MYCA is not optimized for only one vertical. Its core pattern is reusable: sense the world, ground the data, reason over state, coordinate action, and preserve memory. That pattern can serve research, agriculture, infrastructure, conservation, education, field operations, and advanced environmental intelligence. The business advantage is platform breadth without losing a clear technical identity.",
      "The risk is focus. A platform with many possible applications can spread itself too thin. The public strategy should therefore emphasize a clear wedge: environmental intelligence grounded in biological and physical signals. From that wedge, Mycosoft can expand into adjacent markets as the core system proves itself. The reward is that each application strengthens the whole platform by adding data, validation, and customer proof."
    ]
  },
  {
    "id": "governance-and-ethics",
    "title": "Governance and Ethics",
    "paragraphs": [
      "MYCA's governance layer is not an optional feature. It is central to the product. Environmental intelligence can affect people, property, ecosystems, research decisions, infrastructure operations, and public trust. A system that observes and recommends action in the physical world must be designed with constraints from the beginning.",
      "Governance means several things. It means the system should disclose uncertainty. It means actions should be logged. It means sensitive contexts should require human review. It means biological and environmental interventions should be treated carefully. It means the system should distinguish between observation, inference, hypothesis, and recommendation. It means safety should be structural, not a line in a brochure.",
      "Technically, MYCA's governance philosophy can be described as gated autonomy. The system may monitor, summarize, classify, and recommend broadly, but higher-impact actions require stronger evidence, stronger authorization, and clearer auditability. This is especially important for biological systems, field devices, and environments where unintended consequences matter.",
      "Compared to conventional AI systems, this makes MYCA more suitable for serious operational settings. Many AI products rely heavily on user judgment after the answer appears. MYCA is being designed so that uncertainty, provenance, permission, and review are part of the architecture before the answer appears. That is a major difference for customers who need defensible decisions.",
      "The philosophical foundation is stewardship. Intelligence should not only be powerful; it should be responsible. It should not treat every possible action as equally acceptable just because it can be automated. MYCA's governance model reflects the idea that living systems deserve caution, humans deserve transparency, and machines should operate within boundaries.",
      "The business advantage is trust and market access. Regulated customers, scientific organizations, enterprise buyers, and public-sector partners are more likely to adopt AI systems that can demonstrate auditability, explainability, and responsible constraints. The risk is that governance can slow down experimentation. The reward is that it enables adoption in higher-value markets where trust is not optional."
    ]
  },
  {
    "id": "business-advantage",
    "title": "Business Advantage",
    "paragraphs": [
      "MYCA's business advantage comes from convergence. It is not just an AI model, not just a sensor device, not just a dashboard, not just a scientific database, and not just a workflow automation tool. It is the combination of those layers into a single environmental intelligence architecture. That convergence is difficult, but it is also the source of the moat.",
      "The first advantage is data originality. Generic AI systems compete over similar model capabilities and similar public information. MYCA's value grows through original environmental and biological data streams, especially where devices capture signals that are not widely available elsewhere. This creates a path toward proprietary datasets, specialized models, and differentiated insights.",
      "The second advantage is vertical integration. By building across hardware, edge intelligence, biological interfaces, software, data, and orchestration, Mycosoft can design the whole loop rather than waiting for disconnected tools to fit together. This reduces dependency on any one external platform and allows the company to optimize the product around real environmental intelligence instead of generic AI workflows.",
      "The third advantage is category creation. Customers already understand parts of the problem: environmental monitoring, lab automation, compliance logging, sensor networks, AI assistants, data dashboards, and field devices. MYCA unifies those categories under a stronger thesis: the world needs AI that can learn from reality. That is a story investors, customers, researchers, and partners can understand.",
      "The fourth advantage is deployment diversity. A grounded environmental intelligence platform can serve research labs, agriculture, conservation, facilities, infrastructure, education, government, and industry. The same core architecture can be adapted to different customer problems without becoming a completely different product each time.",
      "Compared to other AI systems, MYCA is less exposed to commoditization by model access alone. If another company gains access to the same language model, that does not give it Mycosoft's devices, biological interfaces, field data, environmental memory, signal interpretation workflows, or governance architecture. The differentiation is systemic rather than cosmetic.",
      "The business risk is execution intensity. Vertical integration requires capital discipline, product focus, manufacturing discipline, scientific validation, software reliability, and strong storytelling. The reward is that, if executed well, Mycosoft can occupy a position that generic AI companies and traditional environmental monitoring firms both struggle to reach."
    ]
  },
  {
    "id": "risk-reward-and-the-frontier",
    "title": "Risk, Reward, and the Frontier",
    "paragraphs": [
      "The technical risk is signal validity. Biological and environmental signals are complex, and interpretation must be empirical. Public materials should avoid implying that every fungal signal has a simple meaning or that biological computing is already a solved commercial technology. The correct message is stronger and more credible: Mycosoft is building the tools to measure, learn, validate, and translate these signals over time.",
      "The product risk is reliability. Field systems must work outside controlled demos. Devices need power management, calibration, weather tolerance, maintainability, and strong user experience. The software must handle missing data, noisy streams, sensor drift, and uncertain conclusions. These are real problems, but they are also the problems that separate serious companies from speculative concepts.",
      "The market risk is education. Customers may not yet have a budget line called \"fungi-native environmental intelligence.\" That means Mycosoft must connect the vision to immediate value: earlier detection, better monitoring, better research workflows, better field awareness, better traceability, and better environmental decision support. The visionary story attracts attention; the practical use case closes the deal.",
      "The governance risk is responsibility. AI connected to devices and environments must be designed carefully. Mycosoft's advantage is that it is building governance into the architecture rather than treating it as a press release. The system should be marketed as powerful because it is constrained, not powerful despite constraints.",
      "The reward is enormous. If MYCA succeeds, it creates a new class of AI system: not an internet-trained assistant, not a static monitoring dashboard, and not a purely cloud-based automation tool, but a nature-connected intelligence layer. That layer could support scientific discovery, ecological resilience, climate adaptation, infrastructure awareness, biosecurity, cultivation, education, and new forms of biological computing.",
      "The frontier is difficult because it crosses disciplines. Mycology, embedded hardware, edge computing, data science, governance, AI orchestration, ecology, and product design rarely live inside one company. Mycosoft is building MYCA because the problem demands that integration. No single generic model can solve it alone. No disconnected sensor platform can solve it alone. No conventional dashboard can solve it alone. The reward belongs to the system that connects them."
    ]
  },
  {
    "id": "why-mycosoft-is-building-this",
    "title": "Why Mycosoft Is Building This",
    "paragraphs": [
      "Mycosoft is building MYCA because the world is generating environmental complexity faster than humans can interpret it. Climate instability, biological threats, soil degradation, infrastructure stress, water quality issues, food system pressure, and ecological change all require better sensing and better reasoning. The problem is not only that we lack data. The problem is that much of the data we collect is fragmented, delayed, ungrounded, or disconnected from action.",
      "MYCA is the answer to that fragmentation. It brings together live signals, biological interfaces, sensor networks, structured memory, environmental models, and agentic coordination. It gives Mycosoft a way to build not just devices, but an intelligent system around those devices. It gives customers a way to move from raw environmental data to practical understanding.",
      "Few companies are positioned to build this because the work requires unusual overlap. It requires comfort with fungi and sensors, with field hardware and AI models, with scientific uncertainty and product urgency, with ecological philosophy and business execution. Many AI companies start from software and look outward. Mycosoft starts from the living world and builds intelligence around it.",
      "That is the core differentiation. MYCA is not trying to win by sounding more human than other systems. It is trying to win by being more grounded, more embodied, more environmentally aware, and more useful in the real world. The highest-value AI of the future will not only answer questions about reality. It will help us perceive reality as it changes."
    ]
  },
  {
    "id": "vision",
    "title": "Vision",
    "paragraphs": [
      "The long-term vision is earth-trained, edge-native intelligence. MYCA becomes a system that helps humanity understand living environments with greater precision, humility, and speed. It turns fungi, sensors, devices, models, and people into a coordinated intelligence network. It helps researchers ask better questions, operators see earlier warnings, land managers understand ecosystems, and organizations make decisions based on evidence rather than guesswork.",
      "The vision is not technology dominating nature. It is technology learning from nature. It is a future where AI becomes less isolated from the world and more accountable to it. It is a future where biological systems are not treated as passive resources, but as partners in understanding the planet.",
      "MYCA is built around a simple belief: the next great intelligence system will not be the one that merely reads the most text. It will be the one that can sense, remember, interpret, and respond to the living world.",
      "Mycosoft is building that system."
    ]
  }
] as const

export const metadata: Metadata = {
  title: "MYCA",
  description:
    "MYCA is Mycosoft's edge-native environmental super-intelligence, grounded in live biospheric telemetry, distributed devices, and specialized agents.",
}

export default function Page() {
  return (
    <DocsLayout>
      <article className="max-w-3xl text-foreground [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:scroll-mt-24 [&_h2]:mt-14 [&_h2]:pt-6 [&_h2]:mb-4 [&_h2]:border-t [&_h2]:border-border [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:scroll-mt-24 [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:scroll-mt-24 [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_li]:leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:text-sm [&_hr]:my-12 [&_hr]:border-border">
        <div className="not-prose mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/docs" className="text-muted-foreground hover:text-foreground">
            Docs
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/docs/ai" className="text-muted-foreground hover:text-foreground">
            AI Stack
          </Link>
        </div>

        <h1>MYCA</h1>

        <div className="not-prose my-6 flex flex-wrap items-center gap-2">
          <Badge variant="outline">AI Stack</Badge>
          <Badge variant="default">Draft</Badge>
          <Badge variant="outline">Edge-native environmental intelligence</Badge>
        </div>

        <p className="text-xl font-semibold leading-relaxed text-muted-foreground">{articleTitle}</p>

        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}

        <hr />

        <p className="text-sm text-muted-foreground">
          Previous: <Link href="/docs/ai">AI Stack</Link> ? Next:{" "}
          <Link href="/docs/ai/avani">AVANI</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
