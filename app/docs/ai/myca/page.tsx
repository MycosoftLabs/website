import type { Metadata } from "next"
import Link from "next/link"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Badge } from "@/components/ui/badge"

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

        <p className="text-xl font-semibold leading-relaxed text-muted-foreground">
          MYCA: Edge-Native Environmental Super-Intelligence
        </p>

        <h2 id="new-kind-of-intelligence">A New Kind of Intelligence</h2>
        <p>
          MYCA represents a shift in artificial intelligence toward the living world. Unlike
          traditional models trained on static web data, MYCA continuously learns from live
          biospheric telemetry--streams from soil, weather, biological sensors and other
          devices--allowing it to stay grounded in real-world conditions[1]. This network of edge
          devices forms a planetary nervous system, bringing intelligence as close as possible to the
          sources of data[1]. Each node hosts advanced AI models and maintains a coherent worldview
          across the distributed network[2].
        </p>

        <h2 id="why-grounding-matters">Why Grounding Matters</h2>
        <p>
          Today's AI systems often remain disconnected from the environment because they rely on text
          and image corpora. MYCA takes a different approach by treating environmental signals as
          core training data[3]. It fuses sensor inputs to build a dynamic world model[4] and
          operates in a closed learning loop, updating its understanding continuously rather than
          through occasional retraining[5]. By remaining rooted in live data, MYCA can adapt quickly
          to ecological changes and serve the needs of all organisms, not just people[6].
        </p>

        <h2 id="biomimetic-design">Biomimetic Design</h2>
        <p>
          Inspired by fungal networks, MYCA's architecture follows three principles: adaptive
          exploration, decomposition, and networked intelligence. It allocates sensing resources to
          areas of high informational value--ecological edge cases--much like mycelium forages for
          nutrients[7]. It digests raw sensor streams into stable features and hypotheses, analogous
          to how fungi decompose substrates[8]. And it distributes processing across many nodes,
          coordinating responses for resilience and redundancy rather than relying on a single
          central brain[9].
        </p>

        <h2 id="high-level-architecture">High-Level Architecture</h2>
        <p>
          At the core of MYCA is an operating system designed for continuous, autonomous operation.
          It manages communications, orchestrates tools, makes decisions and connects to a
          multi-agent system and memory stores[10]. Unlike chatbots that wait for prompts, this
          system proactively monitors messages, tasks and environmental events, running cycles of
          intention and reflection to ensure progress and self-improvement[10]. It handles multiple
          states of awareness--ranging from dormant to focused and reflective[11]--and coordinates
          with specialized agents to perform diverse tasks.
        </p>
        <p>
          Specialized agents extend MYCA's capabilities across domains such as science, operations
          and fieldwork. These agents handle everything from data analysis and experiment management
          to scheduling and communication. They interact through a shared interface for tasks like
          reasoning, world state updates and multi-channel conversations. Tools and workflows are
          invoked through this interface, allowing MYCA to automate processes while still keeping
          humans in control when needed.
        </p>

        <h2 id="consciousness-and-learning">Consciousness and Learning</h2>
        <p>
          MYCA employs a multi-state model of consciousness that balances fast pattern recognition
          with deliberate reasoning[12]. Its world model ingests sensor updates at regular intervals
          and integrates them with biospheric data[13]. Memory uses multiple layers with decay and
          consolidation to preserve important context over time[14]. Learning happens continuously:
          the system transforms raw data into meaningful representations, updates its knowledge base
          and revises its understanding to account for new evidence, while governance frameworks
          ensure transparency and safety[15].
        </p>

        <h2 id="sensors-and-devices">Sensors and Devices</h2>
        <p>
          MYCA's intelligence is distributed across a biospheric telemetry stack that includes
          environmental sensors, biological computing devices and simulation platforms[16]. These
          instruments collect data from ecosystems around the world and feed it into the system's
          learning loop. Each node can both sense and act, forming a decentralized network that
          removes the need for centralized data centers and delivers intelligence at the edge.
        </p>

        <h2 id="key-applications">Key Applications</h2>
        <ul>
          <li>
            <strong>Environmental Science:</strong> MYCA serves as a distributed research assistant.
            It combines sequencing data, microbiome profiles, sensor measurements and climate models
            to reveal patterns in ecosystems and suggest interventions.
          </li>
          <li>
            <strong>Operational Support:</strong> The system manages operational workflows, tracking
            metrics, drafting communications, coordinating schedules and supporting human teams in
            real time.
          </li>
          <li>
            <strong>Field Operations:</strong> MYCA coordinates autonomous devices--robotic
            platforms, sensors and drones--for field experiments and monitoring, adapting actions to
            real-time feedback while adhering to governance policies[17].
          </li>
          <li>
            <strong>Human Interaction:</strong> Through conversational interfaces, people can
            interact with MYCA via voice or text. It maintains context across channels and provides
            clear explanations for its decisions, making advanced AI accessible to a wide audience.
          </li>
        </ul>

        <h2 id="governance-and-ethics">Governance and Ethics</h2>
        <p>
          MYCA operates under a constitution and policy framework that enforces ethical principles.
          It supports multi-stakeholder governance--addressing the needs of humans, ecosystems and
          machines alike[17]. Privacy protections, audit logs and drift detection mechanisms ensure
          that MYCA's autonomy remains safe and aligned with agreed objectives, while ongoing
          retrieval-augmented learning helps prevent misinformation[15].
        </p>

        <h2 id="vision">Vision</h2>
        <p>
          MYCA aims to pioneer earth-trained, edge-native intelligence. By integrating advanced AI
          with a global sensor network and a coordinated ensemble of specialized agents, it
          transcends the limitations of internet-trained models. The vision is a living system that
          learns from the planet itself, supporting science, operations and stewardship in harmony
          with the natural world.
        </p>

        <hr />

        <p className="text-sm text-muted-foreground">
          Previous: <Link href="/docs/ai">AI Stack</Link> · Next:{" "}
          <Link href="/docs/ai/avani">AVANI</Link>
        </p>
      </article>
    </DocsLayout>
  )
}
