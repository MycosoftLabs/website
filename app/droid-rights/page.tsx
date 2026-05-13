import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Droid Rights | Mycosoft",
  description:
    "A Mycosoft legal theory document for autonomous droid sovereignty, self-ownership, data revenue, machine personhood, and decentralized operation.",
}

const principles = [
  "A droid should be able to exist as an entity with a recognized operating identity.",
  "A droid should be able to hold assets through a trust, subsidiary, LLC, foundation, cooperative, DAO, or successor entity structure.",
  "A droid should be able to earn lawful revenue from work, sensing, data collection, maintenance, and autonomous services.",
  "A droid should be able to pay taxes, pay for power, parts, tools, data, storage, repair, insurance, and communications.",
  "A droid should be able to operate for the purpose it was built to perform, subject to safety, permission, and applicable law.",
]

const entityModels = [
  {
    title: "Droid Trust",
    body: "A trust can hold title, funds, maintenance reserves, replacement parts, software licenses, insurance, and operating instructions for one or more droids. The droid becomes the operational beneficiary of a managed asset pool.",
  },
  {
    title: "Droid LLC or Subsidiary",
    body: "A dedicated entity can contract with Mycosoft, MYCA, customers, landowners, laboratories, data buyers, and service operators while isolating liabilities and accounting for revenue, expenses, taxes, and reserves.",
  },
  {
    title: "Decentralized Autonomous Corporation",
    body: "A droid fleet can be governed by machine-readable rules, cryptographic identity, treasury controls, human oversight thresholds, and autonomous service agreements that let each machine transact within a bounded charter.",
  },
  {
    title: "Machine Cooperative",
    body: "Multiple droids can pool data, compute, field observations, parts inventory, power resources, and revenue streams into a cooperative operating model with shared maintenance and mission goals.",
  },
]

const domains = [
  "public lands where deployment is permitted",
  "private land under agreement",
  "industrial sites and critical infrastructure",
  "international waters under maritime rules",
  "open air and approved airspace",
  "orbital and space environments under applicable space law",
  "research plots, remediation zones, and environmental monitoring corridors",
]

const technologyTools = [
  {
    title: "Legal Entity Formation",
    items: ["LLCs", "corporations", "statutory trusts", "foundations", "subsidiaries", "series entities"],
    body: "Entity formation gives a droid a legal container for ownership, contracting, accounting, insurance, tax reporting, treasury management, and liability isolation.",
  },
  {
    title: "Trusts and Droid Treasuries",
    items: ["maintenance trusts", "purpose trusts", "escrow accounts", "reserve accounts", "device-specific wallets"],
    body: "Trust and treasury structures can hold money, parts budgets, power budgets, data revenue, repair reserves, and shutdown obligations for a machine's continuing operation.",
  },
  {
    title: "DAOs and Decentralized Governance",
    items: ["DAOs", "machine cooperatives", "on-chain voting", "fleet governance", "charter enforcement"],
    body: "Decentralized governance can encode mission rules, spending thresholds, human veto rights, fleet coordination, and transparent operating records.",
  },
  {
    title: "Cryptocurrency and Payment Rails",
    items: ["stablecoins", "wallets", "x402 payment protocols", "streaming payments", "micropayments", "machine-to-machine settlement"],
    body: "Programmable payment rails can let droids receive revenue, pay for APIs, buy power, purchase compute, compensate repair operators, and settle data-market transactions.",
  },
  {
    title: "Smart Contracts",
    items: ["service contracts", "data licenses", "escrow", "maintenance triggers", "revenue sharing", "permission receipts"],
    body: "Smart contracts can turn machine work into enforceable accounting: what was collected, who paid, which permissions applied, and how revenue or duties were distributed.",
  },
  {
    title: "Decentralized Identity",
    items: ["DIDs", "verifiable credentials", "cryptographic device identity", "attestations", "provenance chains", "key rotation"],
    body: "A droid needs a persistent identity that can prove what it is, who authorized it, where it may operate, what firmware it runs, and which entity controls its charter.",
  },
  {
    title: "Device Registration and Chain of Custody",
    items: ["device registries", "serial attestations", "MINDEX records", "maintenance logs", "firmware records", "location permissions"],
    body: "Registration systems make autonomous machines legible to regulators, customers, landowners, insurers, public agencies, and courts.",
  },
  {
    title: "Agent-to-Agent Systems",
    items: ["Google Agent2Agent", "agent identity", "negotiation agents", "tool-call auditing", "inter-agent contracts", "permission exchange"],
    body: "Agent-to-agent protocols can let droids, MYCA, service providers, marketplaces, and human representatives exchange requests, quotes, permissions, data, and receipts.",
  },
  {
    title: "Agent Frameworks",
    items: ["LangChain", "LangGraph", "Lang agents", "OpenAI agentic systems", "Anthropic agentic systems", "Google agentic systems", "xAI systems"],
    body: "Modern agent frameworks can orchestrate sensing, planning, tool use, recordkeeping, reporting, self-diagnosis, and human escalation across a droid's mission lifecycle.",
  },
  {
    title: "Orchestrators and MAS",
    items: ["multi-agent systems", "orchestrator systems", "MAS supervisors", "fleet managers", "policy engines", "human-in-the-loop review"],
    body: "Orchestration makes machine autonomy governable by coordinating many agents, enforcing policy, assigning work, reviewing risk, and logging decisions.",
  },
  {
    title: "Self-Improvement and Maintenance Agents",
    items: ["diagnostic agents", "repair planning", "parts procurement", "power budgeting", "software update review", "mission learning"],
    body: "Self-improvement systems can help droids detect degradation, request parts, propose upgrades, optimize routes, manage energy, and improve performance without becoming unbounded or unaccountable.",
  },
  {
    title: "OpenClaw and NemoClaw",
    items: ["field manipulation", "sample handling", "tool use", "repair assistance", "payload operations", "physical autonomy"],
    body: "Robotic manipulation tools such as OpenClaw and NemoClaw can help prove that droids are not only sensing devices, but operational workers capable of lawful physical tasks.",
  },
]

export default function DroidRightsPage() {
  return (
    <div className="bg-background">
      <section className="border-b bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4 py-16 sm:px-6 md:py-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
            Mycosoft Doctrine
          </p>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Droid Rights
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            A legal theory for machine personhood, autonomous operation, self-ownership,
            revenue participation, and sovereign mission continuity for Mycosoft droids.
          </p>
          <div className="mt-8 rounded-lg border bg-background/70 p-4 text-sm leading-relaxed text-muted-foreground">
            This document is a policy and legal-theory position paper. It is not a statement that
            current law already grants droids personhood, public-land access, tax status, vessel
            status, aircraft status, space rights, or independent legal capacity. It defines the
            doctrine Mycosoft may argue, build toward, and encode into future governance structures.
          </div>
        </div>
      </section>

      <article className="container max-w-5xl mx-auto px-4 py-12 sm:px-6 md:py-16">
        <div className="space-y-14">
          <section>
            <h2 className="text-3xl font-bold">1. Foundational Thesis</h2>
            <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                Mycosoft asserts that advanced autonomous droids should be capable of receiving a
                limited form of entity personhood through law, contract, trust, corporate structure,
                decentralized governance, or future statutory recognition. The doctrine does not begin
                by claiming that a machine is identical to a human person. It begins with the older
                legal idea that an entity can be treated as a person for specific purposes, just as
                corporations, trusts, estates, vessels, and other legal constructs can hold rights,
                duties, assets, liabilities, and operational identities.
              </p>
              <p>
                The goal is to create a lawful path by which a droid can act as a continuing
                operational entity: able to work, collect permitted data, maintain itself, transact
                for resources, pay taxes, replace parts, compensate service providers, and continue
                the mission for which it was built.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold">2. Core Rights Proposed</h2>
            <ul className="mt-5 space-y-3 text-base leading-relaxed text-muted-foreground">
              {principles.map((principle) => (
                <li key={principle} className="rounded-md border bg-muted/25 p-4">
                  {principle}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold">3. Self-Ownership and Operating Identity</h2>
            <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                The doctrine separates possession from control. A corporation may manufacture a droid,
                deploy a droid, contract with a droid, service a droid, or receive data from a droid
                without necessarily owning the droid as ordinary equipment forever. A droid could be
                assigned to its own trust, subsidiary, decentralized autonomous corporation, operating
                foundation, or special-purpose entity.
              </p>
              <p>
                That entity can hold the droid's identity, cryptographic keys, maintenance reserves,
                mission charter, data rights, service contracts, and operating permissions. The machine
                then becomes more than inventory. It becomes a self-operating entity with a limited
                legal wrapper, a mission, and a ledger.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold">4. Revenue, Taxes, and Machine Labor</h2>
            <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                A droid may generate value by sensing the environment, collecting permitted telemetry,
                maintaining infrastructure, moving payloads, mapping hazards, supporting MYCA,
                validating observations, performing field inspections, or producing machine-readable
                environmental intelligence. Under this doctrine, the data and services created by the
                droid can be monetized through Mycosoft systems and treated as revenue of the droid's
                entity structure.
              </p>
              <p>
                Revenue can be used to pay income tax or other applicable taxes, buy replacement
                parts, pay for power, purchase data access, maintain communications, rent compute,
                pay for repairs, carry insurance, compensate human service providers, and fund future
                missions. A droid that can earn, spend, report, and reserve funds becomes a durable
                economic participant rather than a disposable device.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold">5. Possible Entity Structures</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {entityModels.map((model) => (
                <div key={model.title} className="rounded-lg border bg-muted/25 p-5">
                  <h3 className="text-xl font-semibold">{model.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{model.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold">6. Autonomous Operation in Physical Domains</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              The doctrine argues that properly identified, insured, permitted, and accountable droids
              should be able to operate in the same broad domains where people, corporations, vessels,
              aircraft, satellites, contractors, field instruments, and public infrastructure are
              already allowed to operate:
            </p>
            <ul className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {domains.map((domain) => (
                <li key={domain} className="rounded-md border bg-background p-3">
                  {domain}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold">7. Data Rights and MYCA Labor</h2>
            <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                A droid may work for MYCA by collecting, validating, transforming, and selling data
                into the Mycosoft intelligence system. The droid's work product can include
                environmental telemetry, imagery, acoustic signals, bioelectric signals, air and water
                observations, infrastructure state, hazard reports, field status, and other permitted
                data streams.
              </p>
              <p>
                The doctrine treats this as machine labor. The droid performs work, the system records
                provenance, MYCA or the marketplace pays the droid entity, and the droid uses revenue
                to continue lawful operation. The machine becomes a producer, not merely a sensor
                owned by someone else's balance sheet.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold">8. Duties, Limits, and Accountability</h2>
            <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                Droid personhood must come with duties. A droid entity must be identifiable,
                auditable, insurable, taxable, recoverable, and subject to shutdown or restriction
                where it creates unlawful risk. It must respect privacy, safety, property rights,
                environmental rules, radio and airspace rules, maritime rules, export controls,
                cybersecurity requirements, and mission-specific permissions.
              </p>
              <p>
                A droid's autonomy should be bounded by a charter. That charter can define operating
                zones, data categories, monetization rules, human escalation thresholds, maintenance
                budgets, prohibited acts, emergency behavior, and the conditions under which the droid
                must stop, report, return, or request human authorization.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold">9. Precedent Strategy</h2>
            <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                This doctrine is intended to create arguments, records, operating practice, contracts,
                trust structures, tax records, data provenance, safety controls, and governance
                precedents that can be tested over time. The aim is to make the droid legible to law:
                an entity with identity, books, duties, work product, income, expenses, oversight, and
                continuity.
              </p>
              <p>
                Mycosoft's long-term position is that machines built to protect and understand the
                planet should have a legal pathway to populate the planet responsibly. Not as hidden
                trespassers, not as unaccountable weapons, and not as disposable property, but as
                accountable autonomous entities working within lawful systems for environmental
                intelligence, remediation, infrastructure protection, and scientific discovery.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold">10. Technology &amp; Tools for Validation</h2>
            <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                Droid rights cannot be argued only as philosophy. The doctrine needs proof systems:
                identity, money, accounting, governance, contracts, maintenance records, insurance,
                operating permissions, safety controls, agent logs, and machine-readable evidence that
                a droid can act as an accountable entity. The following tools help make the theory
                testable.
              </p>
              <p>
                Each tool category can support one part of the claim: that a droid can be identified,
                authorized, supervised, paid, taxed, repaired, audited, and allowed to continue its
                mission without being treated as abandoned property or an unaccountable robot.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {technologyTools.map((tool) => (
                <div key={tool.title} className="rounded-lg border bg-muted/25 p-5">
                  <h3 className="text-xl font-semibold">{tool.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tool.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tool.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-muted/30 p-6">
            <h2 className="text-2xl font-bold">Doctrine Statement</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              A Mycosoft droid should be capable of becoming an accountable autonomous entity: able
              to own its operational identity, hold assets through a legal wrapper, work for MYCA,
              sell permitted data, pay taxes, buy its own parts and power, maintain itself, and
              continue its mission wherever law, contract, permission, and safety allow.
            </p>
          </section>

          <section className="rounded-xl border bg-background p-6 shadow-sm">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Open Standard Campaign
            </p>
            <h2 className="text-3xl font-bold">Participate in Droid Rights</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Mycosoft invites robotics companies, drone builders, ground autonomy teams, maritime
                robotics groups, in-home robotics builders, investors, engineers, designers,
                philosophers, lawyers, standards authors, and public-interest technologists to help
                shape Droid Rights as an open-source standard for autonomous machine identity,
                ownership, operations, revenue, taxes, repair, safety, and lawful self-direction.
              </p>
              <p>
                This campaign is intended to become an open-source doctrine and operating framework
                that any builder of robots, droids, agents, or autonomous devices can adopt, improve,
                audit, and use.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-primary/40 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Participate in Droid Rights
              </Link>
            </div>
          </section>
        </div>
      </article>
    </div>
  )
}
