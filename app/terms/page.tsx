import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | Mycosoft",
  description:
    "Mycosoft Terms of Service — Last Updated May 11, 2026. Legal terms governing access to and use of Mycosoft websites, software, hardware, devices, autonomous systems, and services.",
}

export default function TermsPage() {
  return (
    <div className="container py-6 md:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-h1:text-4xl prose-h2:mt-16 prose-h2:pt-8 prose-h2:border-t prose-h2:border-border prose-h2:text-2xl prose-h2:font-bold prose-h3:mt-10 prose-h3:text-xl prose-h3:font-semibold prose-p:my-5 prose-p:leading-relaxed prose-li:leading-relaxed prose-li:my-1.5 prose-ul:my-5 prose-ul:pl-6 prose-ol:my-5 prose-ol:pl-6">
          <h1>{`MYCOSOFT TERMS OF SERVICE`}</h1>
          <div className="not-prose my-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="font-semibold text-foreground">{`Last Updated:`}</dt>
              <dd className="text-muted-foreground">{`May 11, 2026`}</dd>
              <dt className="font-semibold text-foreground">{`Effective Date:`}</dt>
              <dd className="text-muted-foreground">{`May 11, 2026`}</dd>
              <dt className="font-semibold text-foreground">{`Website:`}</dt>
              <dd className="text-muted-foreground">{`mycosoft.com`}</dd>
              <dt className="font-semibold text-foreground">{`Company:`}</dt>
              <dd className="text-muted-foreground">{`Mycosoft, Inc., a Delaware corporation`}</dd>
              <dt className="font-semibold text-foreground">{`California Subsidiary / Operating Affiliate:`}</dt>
              <dd className="text-muted-foreground">{`Mycosoft LLC, a California limited liability company and wholly owned subsidiary or affiliated operating entity of Mycosoft, Inc., where applicable`}</dd>
              <dt className="font-semibold text-foreground">{`Contact:`}</dt>
              <dd className="text-muted-foreground">{`contact@mycosoft.com`}</dd>
            </dl>
          </div>
          <p>{`These Terms of Service, together with all supplemental terms, order forms, product notices, hardware documentation, software licenses, open-source licenses, acceptable use policies, privacy notices, data processing terms, security policies, deployment rules, autonomous systems policies, reseller terms, procurement terms, and other documents incorporated by reference, form a legally binding agreement between you and Mycosoft. By accessing, browsing, logging into, purchasing, downloading, installing, connecting to, receiving data from, interacting with, deploying, reselling, integrating, operating, observing, testing, or otherwise using any Mycosoft website, software, hardware, device, API, dashboard, autonomous agent, AI tool, model, firmware, source code repository, data feed, documentation, simulation, field system, sensor network, robotic platform, environmental intelligence system, biological interface, or service, you agree to these Terms.`}</p>
          <h2 id="section-1">{`1. Agreement; Acceptance; Binding Effect`}</h2>
          <h3 id="sub-1-1">{`1.1 Acceptance by Use`}</h3>
          <p>{`You accept these Terms when you do any of the following:`}</p>
          <ul>
            <li>{`visit or use any Mycosoft website, including mycosoft.com;`}</li>
            <li>{`create, access, or use an account;`}</li>
            <li>{`log into NatureOS, MYCA, MINDEX, AI Studio, Earth Simulator, CREP, FUSARIUM, OEI, SporeBase, HPL, Mycorrhizae Protocol interfaces, device dashboards, APIs, developer portals, or related services;`}</li>
            <li>{`use, download, copy, fork, install, compile, build, execute, inspect, test, or interact with any Mycosoft code, SDK, firmware, software, repository, binary, compiled program, API source code, scripts, models, or documentation;`}</li>
            <li>{`purchase, preorder, lease, borrow, receive, deploy, install, operate, test, modify, connect, or interact with any Mycosoft device, including Mushroom 1, Mushroom-branded devices, MycoBrain, MycoNode, SporeBase, ALARM, Hyphae 1, Tricorder, Petraeus, Mushroom 2, FCI probes, MycoTenna, Psathyrella, Agaric, or any other Mycosoft hardware;`}</li>
            <li>{`receive, ingest, query, view, export, process, redistribute, or rely on any Mycosoft data, telemetry, model output, sensor output, geospatial output, environmental intelligence, biological signal, fungal signal, acoustic signature, public-data feed, open-source intelligence, API output, chain-of-custody record, or dashboard visualization;`}</li>
            <li>{`interact with MYCA, AVANI, NLM, MAS, agentic workflows, autonomous negotiation tools, voice interfaces, chat interfaces, planning tools, scientific agents, business agents, device agents, robotics agents, or other AI systems;`}</li>
            <li>{`act as a value-added reseller, distributor, systems integrator, contractor, subcontractor, channel partner, managed service provider, government contractor, deployment sponsor, research partner, or field operator for any Mycosoft system; or`}</li>
            <li>{`click “I agree,” sign an order form, accept a quote, execute a pilot agreement, connect an API key, power on a device, activate a telemetry stream, open a dashboard, or otherwise manifest assent.`}</li>
          </ul>
          <h3 id="sub-1-2">{`1.2 Binding Entity`}</h3>
          <p>{`If you use the Services on behalf of a company, agency, institution, lab, government entity, nonprofit, university, contractor, reseller, investment entity, or other organization, you represent that you have authority to bind that organization. In that case, “you” means both you personally and the organization you represent.`}</p>
          <h3 id="sub-1-3">{`1.3 No Use Without Agreement`}</h3>
          <p>{`If you do not agree to these Terms, you may not access, use, deploy, operate, integrate, resell, connect to, receive data from, or otherwise interact with the Services.`}</p>
          <h3 id="sub-1-4">{`1.4 Supplemental Terms`}</h3>
          <p>{`Certain Services may be subject to additional terms, including order forms, procurement addenda, hardware terms, beta terms, research agreements, data processing agreements, open-source licenses, government contract clauses, reseller agreements, field deployment authorizations, export control notices, and safety documentation. Supplemental terms control only for the specific Service, transaction, or deployment they cover. These Terms control all other matters.`}</p>
          <h3 id="sub-1-5">{`1.5 Hierarchy of Terms`}</h3>
          <p>{`Unless otherwise expressly stated in a signed writing by an authorized officer of Mycosoft, conflicts are resolved in this order:`}</p>
          <ol>
            <li>{`written enterprise, government, procurement, or master services agreement signed by Mycosoft;`}</li>
            <li>{`signed order form, statement of work, pilot agreement, reseller agreement, or deployment agreement;`}</li>
            <li>{`applicable product-specific supplemental terms;`}</li>
            <li>{`open-source license for specific open-source code only;`}</li>
            <li>{`these Terms;`}</li>
            <li>{`documentation, marketing materials, FAQs, or website statements.`}</li>
          </ol>
          <h2 id="section-2">{`2. Company Identity; Corporate Structure; Affiliates`}</h2>
          <h3 id="sub-2-1">{`2.1 Mycosoft Entity`}</h3>
          <p>{`“Mycosoft,” “Company,” “we,” “us,” or “our” means Mycosoft, Inc., a Delaware corporation, together with its subsidiaries, affiliates, controlled entities, operating divisions, field deployment programs, labs, research programs, software platforms, autonomous agents, device fleets, contractors, subcontractors, and representatives, as applicable.`}</p>
          <h3 id="sub-2-2">{`2.2 California LLC Subsidiary / Operating Affiliate`}</h3>
          <p>{`Where services are performed, operated, supported, developed, manufactured, deployed, tested, sold, distributed, or serviced through Mycosoft LLC, a California limited liability company, references to “Mycosoft” include Mycosoft LLC to the extent applicable. Mycosoft, Inc. remains the parent, owner, licensor, or principal contracting party unless a separate written agreement states otherwise.`}</p>
          <h3 id="sub-2-3">{`2.3 No Personal Liability of Personnel`}</h3>
          <p>{`No officer, director, employee, contractor, developer, scientist, AI system, agent operator, board member, shareholder, affiliate, or representative of Mycosoft is personally liable for obligations under these Terms solely because of their relationship to Mycosoft, except to the extent required by non-waivable law or a separate written agreement signed in an individual capacity.`}</p>
          <h3 id="sub-2-4">{`2.4 Agents and Autonomous Systems Are Company Systems`}</h3>
          <p>{`MYCA, AVANI, MAS agents, device agents, AI assistants, autonomous negotiation tools, autonomous scientific agents, robotics agents, firmware agents, operational bots, and other machine systems are tools, systems, or processes of Mycosoft or its customers. They are not independent legal persons. They do not possess authority to bind Mycosoft except as expressly authorized by a signed written agreement, an authenticated workflow, or a designated officer-approved transaction.`}</p>
          <h3 id="sub-2-5">{`2.5 No Partnership or Agency`}</h3>
          <p>{`Except as expressly stated in a signed reseller, VAR, teaming, subcontract, or agency agreement, these Terms do not create any partnership, joint venture, fiduciary relationship, agency, franchise, employment relationship, or exclusive dealing arrangement.`}</p>
          <h2 id="section-3">{`3. Definitions`}</h2>
          <h3 id="sub-3-1">{`3.1 “Services”`}</h3>
          <p>{`“Services” means all Mycosoft websites, platforms, software, systems, devices, firmware, hardware, APIs, dashboards, data feeds, documentation, models, AI tools, autonomous agents, cloud services, edge services, field systems, research systems, device networks, simulations, developer tools, training systems, products, pilots, professional services, support, maintenance, and related offerings.`}</p>
          <h3 id="sub-3-2">{`3.2 “Platforms”`}</h3>
          <p>{`“Platforms” means Mycosoft software and cloud systems, including NatureOS, Earth Simulator, MINDEX, AI Studio, MYCA, MAS, AVANI, NLM, CREP, OEI, FUSARIUM, Mycorrhizae Protocol interfaces, HPL interfaces, SporeBase dashboards, device portals, field telemetry systems, developer portals, and any successor systems.`}</p>
          <h3 id="sub-3-3">{`3.3 “Devices”`}</h3>
          <p>{`“Devices” means Mycosoft hardware, field equipment, edge nodes, sensors, probes, robotics, drone systems, buoys, gateways, antennas, boards, embedded systems, or biological interfaces, including Mushroom 1, Mushroom-branded electronic sensing devices, MycoBrain, MycoNode, FCI probes, SporeBase, ALARM, Hyphae 1, Tricorder, Petraeus, Mushroom 2, MycoTenna, Psathyrella, Agaric, gateways, edge nodes, and any related accessories.`}</p>
          <h3 id="sub-3-4">{`3.4 “AI Systems”`}</h3>
          <p>{`“AI Systems” means MYCA, AVANI, MAS, NLM, model agents, frontier model integrations, local models, autonomous scientific agents, business agents, robotics agents, voice agents, model orchestration tools, reasoning systems, classifiers, automated decision-support systems, simulations, environmental world models, or other machine-learning, statistical, algorithmic, or automated systems provided by or integrated with Mycosoft.`}</p>
          <h3 id="sub-3-5">{`3.5 “Data”`}</h3>
          <p>{`“Data” means any data, signal, sample, telemetry, input, output, observation, measurement, image, audio, video, biological signal, bioelectric signal, waveform, API output, geospatial coordinate, AIS/ADS-B/vehicle/vessel/train/aircraft/public movement record, specimen record, spore record, model output, simulation output, environmental condition, device log, chain-of-custody record, software log, user content, derived data, metadata, or analytic result.`}</p>
          <h3 id="sub-3-6">{`3.6 “Customer Data”`}</h3>
          <p>{`“Customer Data” means Data submitted, uploaded, provided, or made available by you to Mycosoft or generated by Devices or Services deployed by you or for your benefit, excluding Mycosoft Materials, public data, aggregated data, de-identified data, telemetry used for security, and data independently obtained by Mycosoft.`}</p>
          <h3 id="sub-3-7">{`3.7 “Mycosoft Materials”`}</h3>
          <p>{`“Mycosoft Materials” means all software, firmware, source code, compiled code, APIs, SDKs, hardware designs, schematics, models, algorithms, documentation, interfaces, inventions, patents, patent applications, trademarks, logos, designs, images, dashboards, texts, architecture, trade secrets, protocols, and other materials owned, developed, licensed, or controlled by Mycosoft.`}</p>
          <h3 id="sub-3-8">{`3.8 “Deployment”`}</h3>
          <p>{`“Deployment” means any placement, installation, launch, field test, activation, operation, use, movement, roaming, flight, submersion, anchoring, mounting, soil insertion, sampling, data collection, radio operation, or physical presence of a Device or system in any environment.`}</p>
          <h3 id="sub-3-9">{`3.9 “Deployment Sponsor”`}</h3>
          <p>{`“Deployment Sponsor” means the person or entity responsible for authorizing, funding, directing, hosting, purchasing, leasing, permitting, or benefiting from a Deployment.`}</p>
          <h3 id="sub-3-10">{`3.10 “Operator”`}</h3>
          <p>{`“Operator” means any person or entity that controls, pilots, maintains, installs, monitors, deploys, supervises, retrieves, services, or uses a Device or Service.`}</p>
          <h3 id="sub-3-11">{`3.11 “Public Lands”`}</h3>
          <p>{`“Public Lands” means lands owned, managed, administered, leased, regulated, or controlled by a government entity, including lands managed by the Bureau of Land Management, Department of the Interior, Forest Service, National Park Service, Department of Defense, state agencies, local governments, tribal governments, port authorities, water districts, or other public bodies.`}</p>
          <h3 id="sub-3-12">{`3.12 “OSINT”`}</h3>
          <p>{`“OSINT” means open-source intelligence and publicly or commercially available information, including public government datasets, AIS, ADS-B, geospatial data, satellite data, vessel records, aircraft data, train data, vehicle data, weather data, biodiversity records, specimen records, public infrastructure data, sensor feeds, and third-party APIs.`}</p>
          <h3 id="sub-3-13">{`3.13 “VAR”`}</h3>
          <p>{`“VAR” means a value-added reseller, distributor, integrator, consultant, field deployment partner, managed service provider, reseller, contractor, subcontractor, channel partner, or similar third party authorized to market, configure, deploy, integrate, resell, or support the Services.`}</p>
          <h2 id="section-4">{`4. Scope of Services, Systems, Devices, Platforms, Data, and Covered Activities`}</h2>
          <h3 id="sub-4-1">{`4.1 Covered Services`}</h3>
          <p>{`These Terms cover all Mycosoft Services, whether branded, white-labeled, experimental, prototype, beta, commercial, public-sector, defense, research, open-source, source-available, hosted, self-hosted, embedded, field-deployed, or locally operated.`}</p>
          <h3 id="sub-4-2">{`4.2 Covered Platforms`}</h3>
          <p>{`Covered Platforms include NatureOS, Earth Simulator, MINDEX, AI Studio, MYCA, MAS, AVANI, NLM, CREP, OEI, FUSARIUM, HPL, Mycorrhizae Protocol, SporeBase dashboards, Mushroom dashboards, device managers, AI Studio, developer portals, APIs, repositories, and successor systems.`}</p>
          <h3 id="sub-4-3">{`4.3 Covered Devices`}</h3>
          <p>{`Covered Devices include Mushroom 1, Mushroom-branded electronic sensing devices, MycoBrain, MycoNode, FCI, FCI probes, SporeBase, ALARM, Hyphae 1, Tricorder, Petraeus, Mushroom 2, MycoTenna, Psathyrella, Agaric, gateways, antennas, LoRa nodes, edge compute nodes, robotics platforms, UAV payloads, UAS payloads, maritime buoys, subsurface probes, hydrophones, bioaerosol collectors, environmental sensor kits, and prototypes.`}</p>
          <h3 id="sub-4-4">{`4.4 Covered Data Activities`}</h3>
          <p>{`These Terms cover Data collection, storage, transmission, visualization, analysis, modeling, export, ingestion, fusion, chain-of-custody, cryptographic hashing, model training, anomaly detection, alerting, public-data aggregation, dashboard display, autonomous workflow execution, and AI-generated outputs.`}</p>
          <h3 id="sub-4-5">{`4.5 Covered Physical Domains`}</h3>
          <p>{`These Terms cover use of Services in or related to terrestrial, subsurface, aerial, maritime, inland waterway, underwater, laboratory, built-environment, agricultural, forest, desert, public-land, private-land, industrial, defense, public-sector, international, and remote environments.`}</p>
          <h2 id="section-5">{`5. Eligibility; Authority; Enterprise, Government, and Representative Use`}</h2>
          <h3 id="sub-5-1">{`5.1 Age and Capacity`}</h3>
          <p>{`You must be at least 18 years old and legally capable of entering into binding contracts. You may not use the Services if prohibited by applicable law.`}</p>
          <h3 id="sub-5-2">{`5.2 Organizational Authority`}</h3>
          <p>{`If you use the Services for an organization, you represent and warrant that you have authority to bind that organization and that the organization will comply with these Terms.`}</p>
          <h3 id="sub-5-3">{`5.3 Government Users`}</h3>
          <p>{`Government users may use the Services only under these Terms and any applicable signed government agreement, procurement document, or authorized order. No government procurement terms, flow-downs, agency rules, FAR, DFARS, state procurement clauses, or other public-sector requirements apply to Mycosoft unless expressly accepted in writing by an authorized Mycosoft officer.`}</p>
          <h3 id="sub-5-4">{`5.4 No Unauthorized Procurement Commitments`}</h3>
          <p>{`No quote, demonstration, beta access, pilot, prototype, white paper, technical exchange, data sample, grant discussion, SBIR/STTR submission, cooperative research discussion, teaming discussion, or autonomous agent exchange creates a binding procurement obligation unless contained in a signed agreement.`}</p>
          <h2 id="section-6">{`6. Account Registration, Access Credentials, API Keys, and Security`}</h2>
          <h3 id="sub-6-1">{`6.1 Accounts`}</h3>
          <p>{`You must provide accurate account information and keep it current. You are responsible for all activity under your account, API keys, credentials, device credentials, tokens, certificates, SSH keys, firmware keys, private keys, and service accounts.`}</p>
          <h3 id="sub-6-2">{`6.2 Security Obligations`}</h3>
          <p>{`You must use reasonable security measures, including strong passwords, multi-factor authentication where available, secure storage of credentials, least-privilege access, and prompt revocation of compromised credentials.`}</p>
          <h3 id="sub-6-3">{`6.3 API Keys`}</h3>
          <p>{`API keys and tokens are confidential. You may not share, sell, publish, embed in public repositories, hardcode insecurely, or disclose them except as authorized. You are responsible for all API calls made with your credentials.`}</p>
          <h3 id="sub-6-4">{`6.4 Device Credentials`}</h3>
          <p>{`You must not bypass, disable, alter, clone, extract, sell, publish, or misuse device certificates, firmware keys, identity modules, secure boot chains, tamper switches, encryption keys, or activation credentials.`}</p>
          <h3 id="sub-6-5">{`6.5 Unauthorized Access`}</h3>
          <p>{`You may not access the Services by automated means, scraping, credential stuffing, prompt injection, model exploitation, API abuse, reverse engineering, telemetry spoofing, device impersonation, radio spoofing, firmware extraction, or other unauthorized means.`}</p>
          <h3 id="sub-6-6">{`6.6 Security Incidents`}</h3>
          <p>{`You must promptly notify Mycosoft of any suspected unauthorized access, compromised credential, stolen Device, tampered Device, lost Device, suspected telemetry spoofing, data breach, security vulnerability, or misuse of the Services.`}</p>
          <h2 id="section-7">{`7. Orders, Subscriptions, Preorders, Pilots, Trials, Beta Features, and Professional Services`}</h2>
          <h3 id="sub-7-1">{`7.1 Orders`}</h3>
          <p>{`Orders may be placed through the website, order forms, invoices, quotes, procurement documents, app stores, marketplaces, resellers, VARs, or other authorized channels. Orders are accepted only when confirmed by Mycosoft or an authorized channel partner.`}</p>
          <h3 id="sub-7-2">{`7.2 Preorders`}</h3>
          <p>{`Preorders, reservations, letters of intent, expressions of interest, and early-access purchases are not guarantees of delivery dates, final specifications, regulatory approvals, or commercial availability unless expressly stated in a signed agreement.`}</p>
          <h3 id="sub-7-3">{`7.3 Hardware Availability`}</h3>
          <p>{`Hardware may change before shipment. Mycosoft may modify specifications, firmware, sensors, enclosures, antennas, connectors, battery systems, deployment accessories, edge compute modules, and design features for safety, compliance, supply-chain, performance, manufacturing, or security reasons.`}</p>
          <h3 id="sub-7-4">{`7.4 Beta and Experimental Features`}</h3>
          <p>{`Beta, prototype, research, preview, pilot, alpha, pre-release, evaluation, or experimental Services are provided “as is,” may be discontinued at any time, may contain defects, may change materially, and may not be suitable for operational reliance.`}</p>
          <h3 id="sub-7-5">{`7.5 Professional Services`}</h3>
          <p>{`Professional services, consulting, custom development, field deployment support, procurement assistance, defense proposal support, data science, firmware development, or integration work are governed by the applicable statement of work or signed services agreement.`}</p>
          <h3 id="sub-7-6">{`7.6 No Guaranteed Outcomes`}</h3>
          <p>{`Mycosoft does not guarantee scientific results, environmental outcomes, regulatory approvals, permits, aircraft authorizations, maritime authorizations, public-land approvals, mining claim recognition, grazing permissions, government awards, grants, contracts, carbon credits, tax benefits, insurance coverage, revenue, safety outcomes, or model accuracy.`}</p>
          <h2 id="section-8">{`8. Autonomous Systems, AI Tools, Multi-Agent Systems, and Machine-Generated Actions`}</h2>
          <h3 id="sub-8-1">{`8.1 AI Systems Are Tools`}</h3>
          <p>{`AI Systems are decision-support, automation, analysis, modeling, and operational tools. They do not replace human judgment, regulatory compliance, professional review, field verification, licensed operators, pilots, mariners, engineers, scientists, attorneys, doctors, financial advisors, emergency responders, procurement officials, or government authorities.`}</p>
          <h3 id="sub-8-2">{`8.2 AI Outputs May Be Wrong`}</h3>
          <p>{`AI Outputs may be incomplete, inaccurate, stale, biased, probabilistic, synthetic, hallucinated, misclassified, overconfident, underconfident, spoofed by bad inputs, or unsuitable for your use case. You are responsible for validating AI Outputs before relying on them.`}</p>
          <h3 id="sub-8-3">{`8.3 Human Oversight`}</h3>
          <p>{`You must maintain appropriate human oversight for any AI-assisted operation that may affect safety, property, legal rights, privacy, environment, public infrastructure, financial decisions, regulated activities, government decisions, aircraft, vessels, vehicles, robotics, field devices, biological systems, or public alerts.`}</p>
          <h3 id="sub-8-4">{`8.4 Autonomous Workflows`}</h3>
          <p>{`By using AI Systems, you authorize Mycosoft systems to process inputs, route tasks among agents, call tools, interact with APIs, generate plans, summarize data, recommend actions, create tickets, modify dashboards, queue commands, communicate status, and perform other automated actions within the permissions you configure or authorize.`}</p>
          <h3 id="sub-8-5">{`8.5 No Fully Autonomous High-Risk Reliance Without Separate Agreement`}</h3>
          <p>{`You may not use AI Systems as the sole basis for high-risk decisions, including life safety, targeting, law enforcement, employment, credit, housing, insurance, medical, legal, military action, public benefits, biometric identification, or rights-impacting decisions, without a separate written agreement and required legal, technical, and human oversight controls.`}</p>
          <h3 id="sub-8-6">{`8.6 AI Identity and Disclosure`}</h3>
          <p>{`Where required by law or good practice, users must be informed when they are interacting with AI Systems or receiving AI-generated content. You are responsible for required disclosures when you deploy Mycosoft AI Systems to interact with your users, employees, contractors, government personnel, citizens, customers, patients, students, stakeholders, or the public.`}</p>
          <h2 id="section-9">{`9. Agentic Negotiation, Contracting Workflows, Permissions, and Stakeholder Coordination`}</h2>
          <h3 id="sub-9-1">{`9.1 Agentic Coordination`}</h3>
          <p>{`Mycosoft AI Systems may support workflows for identifying stakeholders, drafting permissions, mapping land rights, requesting site access, preparing documents, coordinating deployment approvals, routing communications, and negotiating operational parameters.`}</p>
          <h3 id="sub-9-2">{`9.2 No Automatic Legal Authority`}</h3>
          <p>{`No AI System, autonomous agent, bot, workflow, or device has authority to bind Mycosoft, you, a landowner, a government agency, a tribal authority, a mineral claimant, a grazing permittee, a vessel owner, an aircraft operator, an easement holder, or any third party unless that authority is expressly granted in a signed writing or authenticated transaction.`}</p>
          <h3 id="sub-9-3">{`9.3 Permission Records`}</h3>
          <p>{`Users must maintain complete records of permissions, permits, landowner consents, easements, right-of-way agreements, leases, mining claim documents, grazing authorizations, public-land approvals, FAA authorizations, maritime approvals, radio licenses, environmental reviews, and other approvals for Deployments.`}</p>
          <h3 id="sub-9-4">{`9.4 Agent Communications Are Logged`}</h3>
          <p>{`Agentic negotiation workflows may be logged, archived, hashed, retained, summarized, reviewed, audited, and used to establish provenance, authority, consent, compliance, and chain-of-custody.`}</p>
          <h3 id="sub-9-5">{`9.5 You Are Responsible for Final Approval`}</h3>
          <p>{`You are responsible for reviewing and approving all legal, operational, deployment, procurement, regulatory, and stakeholder communications before they are relied on or sent, unless a separate signed agreement expressly delegates specific authority.`}</p>
          <h2 id="section-10">{`10. Hardware Devices, Field Equipment, Sensors, Robotics, and Edge Nodes`}</h2>
          <h3 id="sub-10-1">{`10.1 Device Use`}</h3>
          <p>{`You may use Devices only in accordance with documentation, safety instructions, deployment instructions, applicable law, and any written authorization. You are responsible for site selection, installation, operation, maintenance, inspection, recovery, disposal, and safe use.`}</p>
          <h3 id="sub-10-2">{`10.2 Experimental and Environmental Conditions`}</h3>
          <p>{`Devices may be exposed to rain, dust, soil, animals, insects, fungi, corrosion, saltwater, UV, temperature extremes, RF interference, GPS degradation, cellular dead zones, satellite delays, power loss, tampering, vandalism, theft, wildlife interaction, collision, flooding, marine growth, battery degradation, sensor drift, and other environmental conditions. Mycosoft does not guarantee uninterrupted operation.`}</p>
          <h3 id="sub-10-3">{`10.3 No Unauthorized Modifications`}</h3>
          <p>{`You may not modify, disassemble, open, reverse engineer, bypass, tamper with, clone, counterfeit, reflash, jailbreak, patch, unlock, alter, or disable Devices, firmware, secure boot, encryption, tamper switches, telemetry, identity modules, safety systems, or data integrity systems except as expressly authorized.`}</p>
          <h3 id="sub-10-4">{`10.4 Device Recovery`}</h3>
          <p>{`You are responsible for lawful and safe retrieval, removal, disposal, repair, and recovery of Devices. Mycosoft may require recovery or disablement if a Device creates risk, violates law, loses authorization, interferes with others, transmits improperly, enters restricted areas, threatens safety, or is suspected of compromise.`}</p>
          <h3 id="sub-10-5">{`10.5 Field Hazards`}</h3>
          <p>{`You assume all risks associated with field operations, including terrain, wildlife, weather, traffic, water, tides, currents, aircraft, vessels, hazardous substances, biological materials, public interaction, law enforcement contact, utility strikes, buried infrastructure, and site access.`}</p>
          <h3 id="sub-10-6">{`10.6 No Device Personhood or Property Rights`}</h3>
          <p>{`Devices are equipment. Nothing in these Terms gives Devices legal personhood, livestock status, grazing status, homestead status, mineral estate rights, easement rights, public access rights, vessel status, aircraft status, or independent rights to occupy land, airspace, water, spectrum, or infrastructure.`}</p>
          <h2 id="section-11">{`11. Public Lands, BLM/DOI Lands, Mining Claims, Homestead-Derived Property, Grazing Allotments, Easements, and Rights-of-Way`}</h2>
          <h3 id="sub-11-1">{`11.1 No Blanket Public-Land Right`}</h3>
          <p>{`These Terms do not grant any right to enter, occupy, traverse, disturb, sample, dig, drill, anchor, graze, range, mine, prospect, improve, fence, power, transmit from, or deploy Devices on Public Lands. Public Lands may be used only where permitted by applicable law and valid authorization.`}</p>
          <h3 id="sub-11-2">{`11.2 Lawful Authorization Required`}</h3>
          <p>{`Deployments on Public Lands require all applicable permissions, permits, leases, easements, rights-of-way, research authorizations, cooperative agreements, grants, mining claim compliance, grazing authorizations, environmental reviews, agency approvals, tribal approvals, state approvals, local approvals, safety approvals, and site-specific permissions.`}</p>
          <h3 id="sub-11-3">{`11.3 BLM and DOI Lands`}</h3>
          <p>{`Use of Devices on lands managed by the Bureau of Land Management, Department of the Interior, or other public agencies must comply with all applicable federal, state, local, tribal, and agency-specific requirements, including rules governing access, surface disturbance, cultural resources, endangered species, reclamation, rights-of-way, mining operations, grazing allotments, range improvements, roads, utilities, environmental review, and public safety.`}</p>
          <h3 id="sub-11-4">{`11.4 Mining Claims`}</h3>
          <p>{`A mining claim, prospecting right, mineral lease, or related interest does not automatically authorize Device deployment, surface occupancy, environmental sensing, data extraction, digging, drilling, installation, power connection, communications infrastructure, biological sampling, public access, or long-term placement. Operators must confirm the scope of rights and obtain any required surface-use, occupancy, environmental, reclamation, or agency approvals.`}</p>
          <h3 id="sub-11-5">{`11.5 Homestead-Derived Property`}</h3>
          <p>{`References to homesteading, homestead-derived title, patents, historic land grants, or rural property rights do not create any new right to deploy Devices. Deployments on such property require permission from the current lawful owner or authorized holder and compliance with all applicable law.`}</p>
          <h3 id="sub-11-6">{`11.6 Grazing Allotments and Range Concepts`}</h3>
          <p>{`Devices may not “freely roam like cattle” on public lands unless an applicable legal authorization expressly permits that operation. Grazing laws, allotments, leases, permits, or range-improvement concepts do not independently authorize Devices, robotics, drones, probes, antennas, sensors, or edge nodes to enter, occupy, graze, cross, sample, roam, or remain on public lands. Any analogy to livestock, grazing, or range operation is operational only and not a claim of legal status.`}</p>
          <h3 id="sub-11-7">{`11.7 Range Improvements, Power, and Ground Insertion`}</h3>
          <p>{`Plugging Devices into soil, stakes, ground rods, probes, anchors, masts, solar panels, battery enclosures, fences, water systems, power systems, gateways, or other infrastructure may constitute surface use, ground disturbance, range improvement, construction, utility use, research activity, environmental activity, or communications activity requiring prior approval.`}</p>
          <h3 id="sub-11-8">{`11.8 No Environmental Disturbance Without Authority`}</h3>
          <p>{`You may not use the Services to disturb soil, vegetation, water, wildlife, fungi, plants, microbes, cultural sites, archaeological sites, mineral resources, protected species, habitat, wetlands, waterways, caves, public infrastructure, utilities, or other protected resources unless fully authorized and legally compliant.`}</p>
          <h3 id="sub-11-9">{`11.9 Public Land Indemnity`}</h3>
          <p>{`You are solely responsible for claims, fines, penalties, removal costs, reclamation costs, environmental remediation, trespass claims, agency enforcement, civil liability, criminal liability, and third-party claims arising from unauthorized or unlawful Deployment on Public Lands.`}</p>
          <h2 id="section-12">{`12. Private Property, Authorized Sites, Easements, Leases, and Deployment Sponsors`}</h2>
          <h3 id="sub-12-1">{`12.1 Private Property Consent`}</h3>
          <p>{`You may deploy Devices on private property only with permission from the property owner, tenant, easement holder, leaseholder, site manager, or other lawful authority.`}</p>
          <h3 id="sub-12-2">{`12.2 Easements and Rights-of-Way`}</h3>
          <p>{`An easement, right-of-way, utility corridor, access agreement, agricultural lease, mining lease, grazing lease, research agreement, or site-access agreement authorizes only the rights expressly granted. You must not exceed the scope, duration, purpose, location, or method authorized.`}</p>
          <h3 id="sub-12-3">{`12.3 Deployment Sponsor Responsibility`}</h3>
          <p>{`The Deployment Sponsor is responsible for securing and documenting all necessary approvals, stakeholder permissions, landowner consents, safety reviews, insurance, environmental approvals, utility clearances, call-before-you-dig checks, site access, and removal rights.`}</p>
          <h3 id="sub-12-4">{`12.4 No Hidden Deployment`}</h3>
          <p>{`You may not conceal Devices in a manner intended to evade property-owner, stakeholder, agency, or public notice requirements. Devices must be labeled, logged, or disclosed where required by law, contract, safety practice, or deployment documentation.`}</p>
          <h2 id="section-13">{`13. Airspace, UAS, Drones, Aerial Systems, Remote ID, FAA Compliance, and Aviation Operations`}</h2>
          <h3 id="sub-13-1">{`13.1 Aviation Compliance`}</h3>
          <p>{`All UAS, UAV, drone, aerial robotics, aircraft payload, or airborne Deployment must comply with applicable FAA rules, Remote ID rules, registration requirements, Part 107 rules, LAANC or DroneZone authorization, airspace restrictions, temporary flight restrictions, NOTAMs, weather requirements, right-of-way rules, visual-line-of-sight requirements, night operations rules, operations over people rules, BVLOS requirements, state laws, local ordinances, foreign aviation rules, and any applicable waiver.`}</p>
          <h3 id="sub-13-2">{`13.2 Remote Pilot Responsibility`}</h3>
          <p>{`The remote pilot in command, aircraft operator, Deployment Sponsor, and entity directing the flight are solely responsible for lawful and safe operation.`}</p>
          <h3 id="sub-13-3">{`13.3 Controlled Airspace`}</h3>
          <p>{`You may not operate UAS in controlled airspace, restricted airspace, special-use airspace, military operating areas, near airports, over sensitive facilities, in emergency response areas, or in other restricted areas without required authorization.`}</p>
          <h3 id="sub-13-4">{`13.4 Remote ID`}</h3>
          <p>{`You are responsible for ensuring UAS comply with applicable Remote ID requirements unless lawfully operating in an FAA-recognized identification area or under other valid authorization.`}</p>
          <h3 id="sub-13-5">{`13.5 Payloads`}</h3>
          <p>{`Mounting Mycosoft Devices on drones, aircraft, balloons, kites, rockets, tethered systems, or other airborne systems may alter weight, balance, RF behavior, flight performance, safety, and regulatory status. You are solely responsible for payload integration, airworthiness, safety, and authorization.`}</p>
          <h3 id="sub-13-6">{`13.6 No Airspace Rights Created`}</h3>
          <p>{`These Terms do not create airspace rights, flight authorization, FAA approval, waiver, exemption, LAANC approval, airworthiness certification, pilot certification, or right to operate any aircraft.`}</p>
          <h3 id="sub-13-7">{`13.7 Aerial Data`}</h3>
          <p>{`Aerial data collection may implicate privacy, surveillance, trespass, nuisance, critical infrastructure, data protection, law enforcement, wildlife, environmental, and public-safety laws. You are responsible for compliance.`}</p>
          <h2 id="section-14">{`14. Maritime, Inland Waters, International Waters, Buoys, Vessels, Aids to Navigation, and Ocean Deployments`}</h2>
          <h3 id="sub-14-1">{`14.1 Maritime Compliance`}</h3>
          <p>{`All maritime, inland waterway, underwater, buoy, vessel, USV, UUV, hydrophone, mooring, anchor, floating platform, submerged sensor, surface gateway, or coastal Deployment must comply with applicable maritime law, Coast Guard rules, COLREGS, Inland Navigation Rules, port rules, state waters rules, coastal state law, flag state law, environmental law, fisheries law, marine mammal law, protected area rules, navigation requirements, and local harbor authority requirements.`}</p>
          <h3 id="sub-14-2">{`14.2 Private Aids to Navigation`}</h3>
          <p>{`No Device may be represented, used, placed, marked, lighted, signaled, or maintained as an aid to navigation unless all required Coast Guard, state, Army Corps, local, port, or other approvals have been obtained.`}</p>
          <h3 id="sub-14-3">{`14.3 Moorings, Anchors, and Fixed Structures`}</h3>
          <p>{`Moorings, anchors, fixed structures, buoys, bottom-mounted devices, cables, underwater nodes, acoustic systems, and hydrophones may require federal, state, port, environmental, Army Corps, Coast Guard, or other approvals. You are responsible for obtaining them.`}</p>
          <h3 id="sub-14-4">{`14.4 International Waters and High Seas`}</h3>
          <p>{`Operations in international waters are not lawless. High seas or international waters operations remain subject to applicable flag state law, international maritime law, COLREGS, treaty obligations, U.S. law applicable to U.S. persons and entities, sanctions, export controls, contract terms, insurance requirements, port-state controls, coastal-state rules where applicable, environmental obligations, and operational safety duties.`}</p>
          <h3 id="sub-14-5">{`14.5 Vessel and Sensor Data`}</h3>
          <p>{`Vessel, AIS, acoustic, bathymetric, oceanographic, hydrophone, maritime traffic, and underwater detection data may be delayed, inaccurate, spoofed, incomplete, restricted, or subject to third-party terms. It is not a substitute for navigation, watchkeeping, collision avoidance, regulatory reporting, maritime safety systems, or professional seamanship.`}</p>
          <h3 id="sub-14-6">{`14.6 No Maritime Authorization Created`}</h3>
          <p>{`These Terms do not create vessel registration, Coast Guard approval, port permission, anchoring rights, navigational status, private aid authorization, mooring rights, exclusive area rights, salvage rights, fishing rights, mineral rights, seabed rights, or rights under foreign maritime law.`}</p>
          <h2 id="section-15">{`15. Radio, Spectrum, Satellite, LoRa, Wireless, FCC, and Communications Compliance`}</h2>
          <h3 id="sub-15-1">{`15.1 Spectrum Compliance`}</h3>
          <p>{`You are responsible for compliance with all applicable FCC, NTIA, state, foreign, satellite, maritime, aviation, amateur radio, cellular, LoRa, Wi-Fi, Bluetooth, UWB, radar, sonar, acoustic modem, and spectrum rules.`}</p>
          <h3 id="sub-15-2">{`15.2 No Unauthorized Transmission`}</h3>
          <p>{`You may not use Devices or Services to transmit illegally, exceed power limits, operate in unauthorized bands, interfere with licensed services, spoof signals, jam, intercept, decode restricted communications, impersonate devices, defeat geofencing, bypass certifications, or violate radio rules.`}</p>
          <h3 id="sub-15-3">{`15.3 Equipment Authorization`}</h3>
          <p>{`You may not market, import, sell, distribute, modify, or operate RF Devices in a manner that violates equipment authorization, labeling, certification, modular approval, antenna, duty-cycle, exposure, or installation requirements.`}</p>
          <h3 id="sub-15-4">{`15.4 Satellite and Iridium/Backhaul`}</h3>
          <p>{`Satellite communication services, SIMs, modems, Iridium, cellular, broadband, and third-party backhaul are subject to separate provider terms, coverage limitations, export controls, sanctions, tariffs, and geographic restrictions.`}</p>
          <h3 id="sub-15-5">{`15.5 Interference`}</h3>
          <p>{`Mycosoft is not liable for interference, jamming, denial, multipath, congestion, satellite outage, cellular outage, RF conflicts, spectrum enforcement, unauthorized antennas, or improper installation.`}</p>
          <h2 id="section-16">{`16. Environmental, Biological, Mycological, Bioelectric, Bioaerosol, and Fungal Computing Activities`}</h2>
          <h3 id="sub-16-1">{`16.1 Biological Interface Systems`}</h3>
          <p>{`FCI, MycoNode, Mushroom devices, HPL, MycoBrain, SporeBase, MycoTenna, Mycosoft biological computing tools, and related systems may interact with fungi, mycelium, spores, soil, organisms, air, water, microbial communities, bioelectric signals, bioaerosols, or environmental substrates.`}</p>
          <h3 id="sub-16-2">{`16.2 Scientific and Environmental Use`}</h3>
          <p>{`The Services are intended to support lawful research, monitoring, remediation, environmental intelligence, ecological forecasting, biological computing, precision agriculture, contamination mapping, biosecurity, and related uses. They are not a license to collect protected species, disturb habitats, release organisms, alter ecosystems, conduct unauthorized experiments, or create biological hazards.`}</p>
          <h3 id="sub-16-3">{`16.3 No Unauthorized Biological Release`}</h3>
          <p>{`You may not use the Services to release, spread, engineer, cultivate, transport, weaponize, enhance, or distribute organisms, spores, fungi, microbes, pathogens, toxins, invasive species, genetically modified organisms, or biological materials without all required approvals and biosafety controls.`}</p>
          <h3 id="sub-16-4">{`16.4 Bioaerosol and Sample Collection`}</h3>
          <p>{`Bioaerosol, spore, environmental, soil, water, tissue, or biological sample collection must comply with applicable law, lab safety, biosafety, property rights, privacy, chain-of-custody, institutional review, environmental, wildlife, agricultural, and public-health requirements.`}</p>
          <h3 id="sub-16-5">{`16.5 HPL and Fungal Programming`}</h3>
          <p>{`HPL and biological programming tools are provided for lawful research and development. You may not use them for unsafe, unauthorized, exploitative, invasive, destructive, or weaponized biological manipulation.`}</p>
          <h3 id="sub-16-6">{`16.6 Environmental Stewardship`}</h3>
          <p>{`You must use the Services in a manner that avoids unnecessary ecological disruption, habitat damage, wildlife disturbance, pollution, biological contamination, unauthorized extraction, or community harm.`}</p>
          <h2 id="section-17">{`17. Earth Simulator, OSINT, Geospatial Data, Location Data, Tracking Data, and Public Data Feeds`}</h2>
          <h3 id="sub-17-1">{`17.1 Data Sources`}</h3>
          <p>{`Earth Simulator, CREP, NatureOS, OEI, FUSARIUM, MINDEX, NLM, and related Services may incorporate OSINT, public data, third-party APIs, government datasets, commercial feeds, satellite data, AIS, ADS-B, vessel tracking, aircraft tracking, train data, vehicle data, infrastructure data, weather data, biodiversity records, live specimen records, sensor telemetry, and user-submitted data.`}</p>
          <h3 id="sub-17-2">{`17.2 No Guarantee of Accuracy`}</h3>
          <p>{`Data may be inaccurate, incomplete, delayed, mislabeled, spoofed, stale, probabilistic, inferred, synthetic, corrupted, censored, restricted, unavailable, or subject to third-party error. Mycosoft does not guarantee accuracy, completeness, availability, timeliness, chain-of-custody, evidentiary admissibility, or fitness for any particular use.`}</p>
          <h3 id="sub-17-3">{`17.3 No Targeting or Harmful Use`}</h3>
          <p>{`You may not use location, tracking, specimen, vessel, aircraft, vehicle, train, person, infrastructure, wildlife, or biological data for stalking, harassment, doxxing, unlawful surveillance, weapons targeting, kinetic targeting, rights violations, discriminatory profiling, poaching, illegal resource extraction, sabotage, piracy, trafficking, or other unlawful or harmful activities.`}</p>
          <h3 id="sub-17-4">{`17.4 No Navigation Reliance`}</h3>
          <p>{`Earth Simulator, CREP, AIS overlays, ADS-B overlays, bathymetric overlays, acoustic contacts, vessel tracks, aircraft tracks, vehicle tracks, environmental warnings, or related outputs are not primary navigation tools and must not be used as substitutes for legally required navigation systems, charts, watchkeeping, air traffic control, mariner judgment, pilot judgment, certified avionics, nautical charts, or emergency systems.`}</p>
          <h3 id="sub-17-5">{`17.5 Public Specimen and Biodiversity Data`}</h3>
          <p>{`Species, specimen, biodiversity, fungal, live organism, habitat, or ecological records may be sensitive. You must not use them for illegal collection, habitat exploitation, poaching, biopiracy, harassment, commercial extraction, or ecological harm.`}</p>
          <h3 id="sub-17-6">{`17.6 Source Terms`}</h3>
          <p>{`Third-party data may be subject to additional licenses, attribution requirements, use limits, export restrictions, publication restrictions, privacy limits, or downstream-use restrictions. You are responsible for compliance.`}</p>
          <h2 id="section-18">{`18. Data Rights; Telemetry; Sensor Data; Model Training; Derived Data; Provenance`}</h2>
          <h3 id="sub-18-1">{`18.1 Customer Data Ownership`}</h3>
          <p>{`As between you and Mycosoft, you retain ownership of Customer Data, subject to the licenses granted in these Terms and any applicable agreement.`}</p>
          <h3 id="sub-18-2">{`18.2 License to Operate`}</h3>
          <p>{`You grant Mycosoft a worldwide, non-exclusive, royalty-free license to host, store, process, transmit, display, reproduce, analyze, secure, validate, transform, summarize, generate outputs from, and otherwise use Customer Data as needed to provide, support, secure, improve, monitor, maintain, troubleshoot, and operate the Services.`}</p>
          <h3 id="sub-18-3">{`18.3 Telemetry License`}</h3>
          <p>{`You grant Mycosoft the right to collect and process device telemetry, usage data, logs, diagnostics, firmware status, configuration data, sensor health, battery status, radio status, location data, security events, performance data, and error data for operation, safety, security, maintenance, research, product improvement, model improvement, provenance, and compliance.`}</p>
          <h3 id="sub-18-4">{`18.4 Aggregated and De-Identified Data`}</h3>
          <p>{`Mycosoft may use aggregated, de-identified, anonymized, statistical, derived, or non-identifying data for analytics, research, benchmarking, model training, product improvement, publication, security, and commercial development, provided such use does not identify you or your confidential Customer Data except as permitted by law or agreement.`}</p>
          <h3 id="sub-18-5">{`18.5 Model Training`}</h3>
          <p>{`Unless a signed agreement states otherwise, Mycosoft may use Customer Data, telemetry, feedback, device logs, and interaction data to improve Services, train or fine-tune models, validate environmental predictions, improve device performance, detect anomalies, improve safety systems, develop NLM, support MYCA, strengthen AVANI governance, improve MINDEX, and build derived models. Enterprise, government, classified, CUI, confidential, or restricted deployments may have separate data-use restrictions.`}</p>
          <h3 id="sub-18-6">{`18.6 Sensitive Deployment Data`}</h3>
          <p>{`Precise location, critical infrastructure data, defense data, CUI, classified information, trade secrets, sensitive biological data, personal information, and regulated data may require special handling. You must label such data accurately and use the proper Service environment.`}</p>
          <h3 id="sub-18-7">{`18.7 Provenance`}</h3>
          <p>{`Mycosoft may cryptographically hash, timestamp, sign, log, chain, audit, and retain data records, sensor observations, model outputs, agent decisions, calibration events, and chain-of-custody records for provenance, integrity, safety, compliance, scientific reproducibility, security, and evidentiary purposes.`}</p>
          <h3 id="sub-18-8">{`18.8 No Obligation to Preserve All Data`}</h3>
          <p>{`Unless a signed agreement states otherwise, Mycosoft is not obligated to preserve all Data indefinitely. Data may be deleted, archived, summarized, compressed, downgraded, anonymized, or purged according to retention policies, storage limits, legal requirements, or security needs.`}</p>
          <h2 id="section-19">{`19. Privacy; Personal Information; Sensitive Information; Automated Decision-Making; Data Protection`}</h2>
          <h3 id="sub-19-1">{`19.1 Privacy Policy`}</h3>
          <p>{`Mycosoft’s Privacy Policy explains how Mycosoft collects, uses, shares, and protects personal information. The Privacy Policy is incorporated into these Terms.`}</p>
          <h3 id="sub-19-2">{`19.2 Personal Information`}</h3>
          <p>{`You must not submit personal information, sensitive personal information, biometric information, precise location information, health information, children’s information, personnel records, government identifiers, or other regulated data unless authorized and unless the applicable Service environment is designed for that data.`}</p>
          <h3 id="sub-19-3">{`19.3 Automated Decision-Making`}</h3>
          <p>{`Where AI Systems are used for automated decision-making, profiling, scoring, classification, recommendations, alerts, or significant decisions, you are responsible for ensuring lawful notice, consent, opt-out, access, explanation, human review, risk assessment, and other rights required by applicable law.`}</p>
          <h3 id="sub-19-4">{`19.4 California Privacy`}</h3>
          <p>{`For California residents and California-regulated processing, Mycosoft will comply with applicable California privacy laws to the extent they apply. Customers using the Services to process California personal information are responsible for determining whether they are businesses, service providers, contractors, third parties, or other regulated actors and for entering any required data processing terms.`}</p>
          <h3 id="sub-19-5">{`19.5 EU, UK, and International Privacy`}</h3>
          <p>{`For EU, UK, or other international data, you are responsible for lawful basis, notices, data transfer mechanisms, data processing agreements, data subject rights, automated decision-making obligations, AI transparency, and other required compliance unless a separate agreement assigns responsibility to Mycosoft.`}</p>
          <h3 id="sub-19-6">{`19.6 Sensitive Locations`}</h3>
          <p>{`You may not use the Services to collect, infer, or publish personal data from sensitive locations, including homes, schools, medical facilities, places of worship, shelters, protests, political gatherings, union activity, protected cultural sites, or other sensitive areas without lawful basis and appropriate safeguards.`}</p>
          <h2 id="section-20">{`20. Acceptable Use Policy`}</h2>
          <p>{`You may use the Services only for lawful, safe, ethical, authorized, and documented purposes consistent with these Terms. Acceptable uses may include:`}</p>
          <ul>
            <li>{`environmental monitoring;`}</li>
            <li>{`fungal and mycological research;`}</li>
            <li>{`agricultural monitoring;`}</li>
            <li>{`ecological restoration;`}</li>
            <li>{`contamination mapping;`}</li>
            <li>{`biosecurity monitoring;`}</li>
            <li>{`infrastructure resilience monitoring;`}</li>
            <li>{`scientific data collection;`}</li>
            <li>{`environmental simulation;`}</li>
            <li>{`device fleet management;`}</li>
            <li>{`open-source development;`}</li>
            <li>{`lawful public-sector projects;`}</li>
            <li>{`lawful defense and intelligence support focused on environmental awareness, force protection, safety, and defensive use;`}</li>
            <li>{`carbon, climate, soil, air, water, and biodiversity analytics;`}</li>
            <li>{`lawful field deployments; and`}</li>
            <li>{`other uses authorized by Mycosoft.`}</li>
          </ul>
          <h2 id="section-21">{`21. Prohibited Uses; Surveillance, Weaponization, Targeting, Harassment, and Rights Violations`}</h2>
          <p>{`You may not use the Services to:`}</p>
          <ul>
            <li>{`violate law or third-party rights;`}</li>
            <li>{`trespass, invade privacy, or deploy Devices without permission;`}</li>
            <li>{`conduct unlawful surveillance;`}</li>
            <li>{`track, stalk, harass, intimidate, identify, target, or harm individuals or groups;`}</li>
            <li>{`enable weapons targeting, kinetic action, autonomous lethal action, assassination, sabotage, piracy, terrorism, repression, torture, or unlawful military operations;`}</li>
            <li>{`build, train, or operate autonomous weapons or targeting systems without lawful authority, human oversight, and a separate written agreement;`}</li>
            <li>{`identify locations of protected species, rare organisms, archaeological sites, cultural sites, mineral resources, or ecological assets for exploitation or harm;`}</li>
            <li>{`engage in poaching, biopiracy, illegal collection, illegal mining, illegal logging, or illegal extraction;`}</li>
            <li>{`interfere with aircraft, vessels, emergency services, public safety, communications, utilities, navigation, or critical infrastructure;`}</li>
            <li>{`spoof, jam, intercept, or manipulate radio, AIS, ADS-B, GNSS, device telemetry, model outputs, or sensor data;`}</li>
            <li>{`submit malicious code, prompt injections, adversarial inputs, telemetry attacks, or model-exploitation attempts;`}</li>
            <li>{`reverse engineer, copy, clone, counterfeit, or misappropriate Mycosoft technology;`}</li>
            <li>{`violate export controls, sanctions, anti-boycott laws, anti-corruption laws, procurement integrity rules, or classified information rules;`}</li>
            <li>{`process personal information unlawfully;`}</li>
            <li>{`use the Services for discriminatory profiling, social scoring, unlawful biometric identification, or rights-impacting automated decisions;`}</li>
            <li>{`use the Services for financial trading, insurance, employment, housing, lending, benefits, legal, medical, or other regulated decisions without separate compliance controls;`}</li>
            <li>{`overload, degrade, scrape, crawl, attack, or abuse the Services;`}</li>
            <li>{`misrepresent Mycosoft affiliation, certification, authority, or endorsement; or`}</li>
            <li>{`use Services in any manner that Mycosoft reasonably believes creates safety, legal, environmental, reputational, regulatory, or security risk.`}</li>
          </ul>
          <h2 id="section-22">{`22. Safety-Critical, Life-Critical, Navigation, Emergency, Medical, Legal, Financial, and Professional Reliance Disclaimer`}</h2>
          <h3 id="sub-22-1">{`22.1 Not Safety-Critical Unless Separately Certified`}</h3>
          <p>{`Unless expressly stated in a signed agreement and supported by required certification, the Services are not designed, certified, or warranted for safety-critical, life-critical, emergency response, aircraft navigation, vessel navigation, autonomous driving, weapons control, medical diagnosis, legal advice, financial advice, structural safety, public warning, or regulatory compliance as sole-source systems.`}</p>
          <h3 id="sub-22-2">{`22.2 No Professional Advice`}</h3>
          <p>{`Outputs are informational only and do not constitute legal, medical, financial, tax, engineering, environmental, aviation, maritime, insurance, public safety, procurement, or regulatory advice.`}</p>
          <h3 id="sub-22-3">{`22.3 Required Review`}</h3>
          <p>{`You must obtain professional review before relying on outputs for regulated or high-consequence decisions.`}</p>
          <h3 id="sub-22-4">{`22.4 Emergency Disclaimer`}</h3>
          <p>{`Do not rely on the Services to contact emergency services or manage emergencies. In an emergency, contact the appropriate emergency authority.`}</p>
          <h2 id="section-23">{`23. Open Source, Source-Available Components, Public Interfaces, and Security-Driven Disclosure`}</h2>
          <h3 id="sub-23-1">{`23.1 Open-Source Components`}</h3>
          <p>{`Some Mycosoft code, libraries, SDKs, protocols, dashboards, examples, integrations, blockchain-facing tools, data-ledger tools, public financial tools, or security-sensitive public interfaces may be released under open-source or source-available licenses.`}</p>
          <h3 id="sub-23-2">{`23.2 Open-Source License Controls`}</h3>
          <p>{`Open-source components are licensed under their specific repository license. Those licenses govern only the specific code identified as open source and do not grant rights to Mycosoft proprietary software, firmware, hardware, schematics, device designs, trademarks, patents, trade secrets, or confidential materials.`}</p>
          <h3 id="sub-23-3">{`23.3 Security-Driven Open Source`}</h3>
          <p>{`Mycosoft may open source certain public-facing, blockchain-facing, API-facing, or financial-data-facing systems for transparency and security. That does not convert related firmware, hardware, internal APIs, models, schematics, device interiors, manufacturing methods, or backend systems into open-source materials.`}</p>
          <h3 id="sub-23-4">{`23.4 No Implied License`}</h3>
          <p>{`No rights are granted by implication. All rights not expressly granted are reserved.`}</p>
          <h2 id="section-24">{`24. Proprietary Software, Firmware, Hardware, Schematics, Device Designs, APIs, Models, and Trade Secrets`}</h2>
          <h3 id="sub-24-1">{`24.1 Proprietary Materials`}</h3>
          <p>{`Mycosoft Materials are protected by intellectual property, trade secret, contract, and other laws.`}</p>
          <h3 id="sub-24-2">{`24.2 Restrictions`}</h3>
          <p>{`You may not copy, reproduce, modify, translate, adapt, distribute, sell, rent, lease, sublicense, host, disclose, publish, train competing models on, reverse engineer, decompile, disassemble, emulate, clone, counterfeit, or create derivative works from Mycosoft Materials except as expressly authorized.`}</p>
          <h3 id="sub-24-3">{`24.3 Firmware`}</h3>
          <p>{`Firmware is proprietary unless expressly released under a specific open-source license. You may not extract, modify, reflash, patch, bypass, disable, or redistribute firmware except as authorized.`}</p>
          <h3 id="sub-24-4">{`24.4 Hardware Designs and Schematics`}</h3>
          <p>{`Device schematics, PCB layouts, mechanical designs, enclosures, connector maps, industrial designs, sensor arrangements, wiring harnesses, manufacturing files, STL files, CAD files, firmware interfaces, and device interiors are proprietary unless expressly released under a written license.`}</p>
          <h3 id="sub-24-5">{`24.5 APIs and Compiled Programs`}</h3>
          <p>{`API source code, compiled programs, binaries, cloud services, edge services, model services, protocol implementations, orchestration systems, and dashboards are proprietary unless expressly licensed.`}</p>
          <h3 id="sub-24-6">{`24.6 Trade Secrets`}</h3>
          <p>{`You must not disclose or misuse nonpublic Mycosoft technical, business, scientific, manufacturing, procurement, pricing, customer, research, or operational information.`}</p>
          <h2 id="section-25">{`25. Trademarks, Brand Assets, Product Names, “Mushroom” Marks, Logos, Imagery, and Publicity`}</h2>
          <h3 id="sub-25-1">{`25.1 Mycosoft Marks`}</h3>
          <p>{`“Mycosoft,” “MYCA,” “AVANI,” “NatureOS,” “MINDEX,” “MycoBrain,” “MycoNode,” “Mycorrhizae,” “SporeBase,” “ALARM,” “FUSARIUM,” “CREP,” “OEI,” “HPL,” “Hyphae,” “Petraeus,” “Tricorder,” “Psathyrella,” “Agaric,” “Mushroom 1,” “Mushroom 2,” and related names, logos, slogans, text, imagery, visual designs, product shapes, and branding are Mycosoft marks or brand assets.`}</p>
          <h3 id="sub-25-2">{`25.2 “Mushroom” Mark`}</h3>
          <p>{`“MUSHROOM,” when used in connection with Mycosoft environmental sensing devices, biological computing devices, autonomous telemetry hardware, electronic sensing devices, fungal interface devices, edge environmental intelligence systems, or related software and services, is claimed as a Mycosoft trademark or product mark to the extent protectable. Nothing in these Terms claims ownership of the generic word “mushroom” for ordinary biological, culinary, educational, or non-trademark uses.`}</p>
          <h3 id="sub-25-3">{`25.3 No Brand Misuse`}</h3>
          <p>{`You may not use Mycosoft marks in a way that suggests sponsorship, endorsement, partnership, certification, reseller status, agency, or affiliation without written authorization.`}</p>
          <h3 id="sub-25-4">{`25.4 No Counterfeit Devices`}</h3>
          <p>{`You may not manufacture, market, sell, distribute, import, export, repair, refurbish, or deploy counterfeit, cloned, confusingly similar, or unauthorized Mycosoft-branded devices.`}</p>
          <h3 id="sub-25-5">{`25.5 Publicity`}</h3>
          <p>{`You may not issue press releases, use Mycosoft’s name in marketing, identify Mycosoft as a customer or partner, or make public claims about Mycosoft without written permission, except as permitted by law.`}</p>
          <h2 id="section-26">{`26. Patents, Patent-Pending Technology, Industrial Designs, Utility Claims, and Reservation of Rights`}</h2>
          <h3 id="sub-26-1">{`26.1 Patent-Pending Technology`}</h3>
          <p>{`Mycosoft technology may be protected by pending or issued design patents, utility patents, provisional applications, trade secrets, copyrights, trademarks, industrial designs, and other rights covering device interiors, biological interfaces, fungal computing, environmental sensing, hardware form factors, firmware, protocols, AI systems, data provenance, telemetry, and related inventions.`}</p>
          <h3 id="sub-26-2">{`26.2 No Patent License`}</h3>
          <p>{`Except as expressly stated in a signed agreement or open-source license, these Terms do not grant any patent license.`}</p>
          <h3 id="sub-26-3">{`26.3 Reservation`}</h3>
          <p>{`All rights not expressly granted are reserved by Mycosoft.`}</p>
          <h2 id="section-27">{`27. Feedback, Ideas, Improvements, Contributions, and Community Submissions`}</h2>
          <h3 id="sub-27-1">{`27.1 Feedback License`}</h3>
          <p>{`If you provide feedback, suggestions, ideas, bug reports, feature requests, designs, code, documentation, data, model outputs, scientific hypotheses, field observations, or improvements, you grant Mycosoft a perpetual, worldwide, irrevocable, sublicensable, transferable, royalty-free license to use, reproduce, modify, commercialize, and incorporate them without compensation.`}</p>
          <h3 id="sub-27-2">{`27.2 Contributions`}</h3>
          <p>{`Contributions to open-source repositories are governed by the applicable repository license and contribution terms. Mycosoft may require a contributor license agreement for certain projects.`}</p>
          <h3 id="sub-27-3">{`27.3 No Confidentiality for Unsolicited Ideas`}</h3>
          <p>{`Unsolicited ideas are not confidential unless covered by a written confidentiality agreement.`}</p>
          <h2 id="section-28">{`28. Third-Party Services, Data Sources, APIs, Open-Source Dependencies, and External Platforms`}</h2>
          <h3 id="sub-28-1">{`28.1 Third-Party Services`}</h3>
          <p>{`The Services may integrate with third-party services, including cloud providers, AI model providers, payment processors, mapping providers, satellite providers, AIS/ADS-B providers, cellular providers, LoRa networks, data brokers, government APIs, open-source repositories, blockchains, development tools, lab tools, and public datasets.`}</p>
          <h3 id="sub-28-2">{`28.2 Third-Party Terms`}</h3>
          <p>{`Your use of third-party services is subject to third-party terms. Mycosoft is not responsible for third-party services, data, outages, changes, errors, security issues, or restrictions.`}</p>
          <h3 id="sub-28-3">{`28.3 No Endorsement`}</h3>
          <p>{`Third-party references do not imply endorsement unless expressly stated.`}</p>
          <h3 id="sub-28-4">{`28.4 Third-Party Data`}</h3>
          <p>{`Third-party Data may be subject to rate limits, licensing terms, attribution requirements, export restrictions, privacy limits, and use restrictions.`}</p>
          <h2 id="section-29">{`29. Government, Defense, Public Sector, CUI, Classified Information, Export-Controlled Data, and Procurement Terms`}</h2>
          <h3 id="sub-29-1">{`29.1 Government Use`}</h3>
          <p>{`Government use is subject to these Terms unless a signed government agreement states otherwise.`}</p>
          <h3 id="sub-29-2">{`29.2 No Classified Data on Public Services`}</h3>
          <p>{`You may not submit classified information, national security information, restricted data, export-controlled technical data, CUI, law enforcement sensitive information, protected critical infrastructure information, or other regulated government data to public or commercial Services unless the environment is expressly authorized for that category and a signed agreement is in place.`}</p>
          <h3 id="sub-29-3">{`29.3 CUI and Classified Environments`}</h3>
          <p>{`CUI, classified, defense, intelligence, IL4, IL5, FedRAMP, NIST 800-53, CAC/PIV, STIX/TAXII, JADC2, Link-16, NATO STANAG, or similar deployments require separate written agreements, system security plans, authorization boundaries, and applicable controls.`}</p>
          <h3 id="sub-29-4">{`29.4 Commercial Item`}</h3>
          <p>{`Unless expressly agreed otherwise, Mycosoft software, hardware, documentation, and services are commercial products, commercial services, and commercial computer software developed at private expense.`}</p>
          <h3 id="sub-29-5">{`29.5 Restricted Government Rights`}</h3>
          <p>{`Government rights in software, firmware, technical data, documentation, inventions, and hardware designs are limited to those expressly granted in a signed agreement or required by applicable procurement law.`}</p>
          <h3 id="sub-29-6">{`29.6 No Unaccepted Flow-Downs`}</h3>
          <p>{`FAR, DFARS, agency, state, local, university, grant, cooperative agreement, subcontract, or prime contract clauses apply only if expressly accepted by Mycosoft in writing.`}</p>
          <h3 id="sub-29-7">{`29.7 Procurement Integrity`}</h3>
          <p>{`You must not use the Services to violate procurement integrity rules, unauthorized disclosure rules, organizational conflict rules, lobbying restrictions, gift rules, or government ethics requirements.`}</p>
          <h2 id="section-30">{`30. Export Controls, Sanctions, ITAR, EAR, OFAC, Anti-Corruption, and Restricted End Uses`}</h2>
          <h3 id="sub-30-1">{`30.1 Export Compliance`}</h3>
          <p>{`You must comply with all applicable export control and trade laws, including the Export Administration Regulations, International Traffic in Arms Regulations, sanctions laws, customs laws, anti-boycott laws, and foreign trade controls.`}</p>
          <h3 id="sub-30-2">{`30.2 Restricted Parties`}</h3>
          <p>{`You may not use, export, reexport, transfer, provide, sell, license, deploy, support, or make available the Services to restricted parties, sanctioned parties, embargoed destinations, prohibited end users, or prohibited end uses.`}</p>
          <h3 id="sub-30-3">{`30.3 Controlled Technology`}</h3>
          <p>{`Certain Devices, firmware, technical data, defense integrations, sensing systems, acoustic systems, UAS systems, maritime systems, cryptographic systems, AI models, and environmental intelligence tools may be subject to export classification, licensing, or restrictions.`}</p>
          <h3 id="sub-30-4">{`30.4 No Unauthorized Defense Export`}</h3>
          <p>{`You may not use the Services to export defense articles, defense services, technical data, military systems, controlled training, controlled software, or controlled assistance without required authorization.`}</p>
          <h3 id="sub-30-5">{`30.5 Anti-Corruption`}</h3>
          <p>{`You must comply with anti-bribery and anti-corruption laws, including the Foreign Corrupt Practices Act, and may not offer improper payments, gifts, benefits, or inducements in connection with the Services.`}</p>
          <h3 id="sub-30-6">{`30.6 End-Use Certification`}</h3>
          <p>{`Mycosoft may require end-user, end-use, destination, export classification, sanctions, or compliance certifications before providing Services.`}</p>
          <h3 id="sub-30-7">{`30.7 Suspension`}</h3>
          <p>{`Mycosoft may suspend or terminate access if it reasonably suspects export, sanctions, anti-corruption, procurement, national security, or restricted end-use violations.`}</p>
          <h2 id="section-31">{`31. VARs, Resellers, Distributors, Integrators, Channel Partners, Subcontractors, and Managed Service Providers`}</h2>
          <h3 id="sub-31-1">{`31.1 Authorization Required`}</h3>
          <p>{`No person or entity may act as a VAR, reseller, distributor, channel partner, integrator, subcontractor, managed service provider, or deployment partner for Mycosoft unless authorized in writing.`}</p>
          <h3 id="sub-31-2">{`31.2 No Authority to Bind Mycosoft`}</h3>
          <p>{`VARs and partners have no authority to bind Mycosoft, modify these Terms, make warranties, grant rights, approve deployments, authorize public-land use, approve government clauses, or accept liability unless expressly authorized in writing.`}</p>
          <h3 id="sub-31-3">{`31.3 Flow-Down Terms`}</h3>
          <p>{`VARs must flow down these Terms and applicable supplemental terms to end users, deployment sponsors, subcontractors, and operators.`}</p>
          <h3 id="sub-31-4">{`31.4 Compliance Obligations`}</h3>
          <p>{`VARs are responsible for export compliance, sanctions screening, procurement compliance, anti-corruption compliance, data protection, device deployment compliance, airspace compliance, maritime compliance, spectrum compliance, public-land compliance, and customer training.`}</p>
          <h3 id="sub-31-5">{`31.5 Records`}</h3>
          <p>{`VARs must maintain accurate records of sales, deployments, customers, end users, export destinations, serial numbers, firmware versions, site locations, permissions, and support activities.`}</p>
          <h3 id="sub-31-6">{`31.6 Indemnity by VARs`}</h3>
          <p>{`VARs must indemnify Mycosoft for claims arising from unauthorized representations, improper deployments, customer misuse, failure to flow down terms, illegal export, procurement violations, or failure to comply with law.`}</p>
          <h2 id="section-32">{`32. Fees, Taxes, Payment, Billing, Renewals, Credits, Refunds, and Suspension for Nonpayment`}</h2>
          <h3 id="sub-32-1">{`32.1 Fees`}</h3>
          <p>{`You agree to pay all fees in applicable orders, invoices, subscriptions, quotes, marketplaces, or agreements.`}</p>
          <h3 id="sub-32-2">{`32.2 Taxes`}</h3>
          <p>{`Fees are exclusive of taxes unless stated otherwise. You are responsible for sales, use, VAT, GST, excise, import, customs, withholding, telecommunications, regulatory, environmental, and similar taxes.`}</p>
          <h3 id="sub-32-3">{`32.3 Payment`}</h3>
          <p>{`Payments are due as stated in the applicable invoice or order. Late amounts may accrue interest at the maximum lawful rate or 1.5% per month, whichever is lower.`}</p>
          <h3 id="sub-32-4">{`32.4 Renewals`}</h3>
          <p>{`Subscriptions renew automatically unless canceled as described in the applicable order.`}</p>
          <h3 id="sub-32-5">{`32.5 Credits and Refunds`}</h3>
          <p>{`Credits and refunds are provided only as expressly stated in an order or required by law.`}</p>
          <h3 id="sub-32-6">{`32.6 Suspension`}</h3>
          <p>{`Mycosoft may suspend Services for nonpayment, failed payment, chargeback, fraud, excessive usage, security risk, regulatory risk, or violation of these Terms.`}</p>
          <h2 id="section-33">{`33. Service Availability, Maintenance, Modifications, Deprecations, Data Retention, and Removal`}</h2>
          <h3 id="sub-33-1">{`33.1 Availability`}</h3>
          <p>{`Mycosoft does not guarantee uninterrupted, error-free, or continuous Services unless a signed service level agreement states otherwise.`}</p>
          <h3 id="sub-33-2">{`33.2 Maintenance`}</h3>
          <p>{`Mycosoft may perform maintenance, updates, security patches, firmware upgrades, model updates, infrastructure migrations, device updates, or service changes.`}</p>
          <h3 id="sub-33-3">{`33.3 Modifications`}</h3>
          <p>{`Mycosoft may modify, suspend, deprecate, replace, or discontinue Services, APIs, models, devices, data feeds, features, dashboards, firmware, or documentation.`}</p>
          <h3 id="sub-33-4">{`33.4 Deprecation`}</h3>
          <p>{`Mycosoft may provide deprecation notice where reasonable but is not required to maintain legacy systems indefinitely.`}</p>
          <h3 id="sub-33-5">{`33.5 Data Retention`}</h3>
          <p>{`Data retention varies by Service, plan, classification, deployment, agreement, and legal requirement. Mycosoft may delete inactive accounts, logs, telemetry, archives, or data as permitted by law and agreement.`}</p>
          <h3 id="sub-33-6">{`33.6 Device Removal`}</h3>
          <p>{`Mycosoft may request or require removal, disablement, firmware update, remote lockout, or recovery of Devices that are unsafe, unauthorized, compromised, noncompliant, or harmful.`}</p>
          <h2 id="section-34">{`34. Security, Responsible Disclosure, Reverse Engineering, Tampering, Vulnerability Research, and Device Integrity`}</h2>
          <h3 id="sub-34-1">{`34.1 Security Testing`}</h3>
          <p>{`You may not conduct penetration testing, vulnerability scanning, adversarial model testing, RF testing, device probing, firmware extraction, reverse engineering, telemetry injection, or exploit testing against the Services without written authorization.`}</p>
          <h3 id="sub-34-2">{`34.2 Responsible Disclosure`}</h3>
          <p>{`Security vulnerabilities should be reported to contact@mycosoft.com with sufficient detail. You must not publicly disclose vulnerabilities before Mycosoft has had a reasonable opportunity to investigate and remediate.`}</p>
          <h3 id="sub-34-3">{`34.3 No Exploitation`}</h3>
          <p>{`You may not exploit vulnerabilities, access data, modify systems, degrade service, exfiltrate secrets, disable safety systems, or use vulnerability research to harm Mycosoft or others.`}</p>
          <h3 id="sub-34-4">{`34.4 Device Integrity`}</h3>
          <p>{`You must not bypass secure boot, encrypted flash, tamper detection, zeroization, cryptographic identity, firmware signatures, telemetry authentication, or safety controls.`}</p>
          <h3 id="sub-34-5">{`34.5 Good-Faith Research`}</h3>
          <p>{`Mycosoft may provide separate written safe-harbor terms for authorized good-faith security research.`}</p>
          <h2 id="section-35">{`35. User Content, Customer Data, Deployment Data, and User Responsibilities`}</h2>
          <h3 id="sub-35-1">{`35.1 User Content`}</h3>
          <p>{`You are responsible for all content, prompts, inputs, documents, images, audio, code, data, commands, device instructions, and deployment information you submit.`}</p>
          <h3 id="sub-35-2">{`35.2 Rights`}</h3>
          <p>{`You represent that you have all rights, permissions, consents, and authority needed to submit User Content and Customer Data.`}</p>
          <h3 id="sub-35-3">{`35.3 Accuracy`}</h3>
          <p>{`You are responsible for accuracy of site information, deployment information, permissions, legal status, environmental conditions, coordinates, device configurations, and operational instructions.`}</p>
          <h3 id="sub-35-4">{`35.4 Commands`}</h3>
          <p>{`You are responsible for commands issued to Devices, agents, APIs, workflows, or models using your account or credentials.`}</p>
          <h3 id="sub-35-5">{`35.5 Logs`}</h3>
          <p>{`Mycosoft may log prompts, commands, user actions, device actions, model outputs, API calls, safety events, and deployment activity for security, audit, debugging, compliance, improvement, and provenance.`}</p>
          <h2 id="section-36">{`36. Disclaimers of Warranties`}</h2>
          <h3 id="sub-36-1">{`36.1 As-Is`}</h3>
          <p>{`The Services are provided “as is” and “as available,” without warranties of any kind, express, implied, statutory, or otherwise.`}</p>
          <h3 id="sub-36-2">{`36.2 No Implied Warranties`}</h3>
          <p>{`Mycosoft disclaims all implied warranties, including merchantability, fitness for a particular purpose, title, non-infringement, accuracy, availability, reliability, quiet enjoyment, and course of dealing.`}</p>
          <h3 id="sub-36-3">{`36.3 No Warranty of Data Accuracy`}</h3>
          <p>{`Mycosoft does not warrant that Data, telemetry, AI Outputs, OSINT, public data, geospatial data, location data, model outputs, classifications, alerts, chain-of-custody records, or dashboards are accurate, complete, timely, legally sufficient, or suitable for any purpose.`}</p>
          <h3 id="sub-36-4">{`36.4 No Warranty of Regulatory Approval`}</h3>
          <p>{`Mycosoft does not warrant that any Device, Deployment, AI Output, model, dashboard, report, data feed, public-land use, airspace use, maritime use, radio use, government use, or biological use is approved by any regulator or lawful in any specific jurisdiction.`}</p>
          <h3 id="sub-36-5">{`36.5 No Warranty Against Environmental Loss`}</h3>
          <p>{`Mycosoft does not warrant against loss, damage, theft, vandalism, weather damage, wildlife damage, biofouling, corrosion, battery failure, sensor drift, radio interference, GPS denial, satellite outage, cellular outage, soil conditions, water conditions, marine hazards, or other field risks.`}</p>
          <h2 id="section-37">{`37. Limitation of Liability`}</h2>
          <h3 id="sub-37-1">{`37.1 Exclusion of Damages`}</h3>
          <p>{`To the maximum extent permitted by law, Mycosoft will not be liable for indirect, incidental, special, consequential, exemplary, punitive, enhanced, or lost-profit damages, including loss of revenue, goodwill, data, use, contracts, business opportunity, environmental credits, government awards, scientific results, procurement opportunity, device loss, deployment failure, or model inaccuracy.`}</p>
          <h3 id="sub-37-2">{`37.2 Liability Cap`}</h3>
          <p>{`To the maximum extent permitted by law, Mycosoft’s total liability arising out of or related to the Services or these Terms will not exceed the greater of: (a) amounts paid by you to Mycosoft for the specific Service giving rise to the claim during the twelve months before the event giving rise to liability; or (b) one hundred U.S. dollars.`}</p>
          <h3 id="sub-37-3">{`37.3 High-Risk Activities`}</h3>
          <p>{`Mycosoft is not liable for claims arising from high-risk or unauthorized uses, including aviation operations, maritime operations, public-land Deployments, defense use, biological use, environmental interventions, device roaming, RF transmission, emergency use, navigation, targeting, surveillance, life-critical use, or regulatory noncompliance.`}</p>
          <h3 id="sub-37-4">{`37.4 Basis of Bargain`}</h3>
          <p>{`These limitations are essential to the bargain between you and Mycosoft and apply even if a remedy fails of its essential purpose.`}</p>
          <h3 id="sub-37-5">{`37.5 Non-Waivable Rights`}</h3>
          <p>{`Some jurisdictions do not allow certain limitations. In those jurisdictions, liability is limited to the maximum extent permitted by law.`}</p>
          <h2 id="section-38">{`38. Indemnification`}</h2>
          <h3 id="sub-38-1">{`38.1 Your Indemnity`}</h3>
          <p>{`You will defend, indemnify, and hold harmless Mycosoft, its affiliates, officers, directors, employees, contractors, agents, licensors, investors, and partners from claims, damages, losses, liabilities, penalties, fines, costs, and expenses, including attorneys’ fees, arising from:`}</p>
          <ul>
            <li>{`your use or misuse of the Services;`}</li>
            <li>{`your Customer Data, User Content, or prompts;`}</li>
            <li>{`your Deployments;`}</li>
            <li>{`unauthorized public-land, private-land, airspace, maritime, or spectrum use;`}</li>
            <li>{`device damage, device loss, trespass, nuisance, environmental harm, or property damage;`}</li>
            <li>{`privacy, surveillance, stalking, harassment, or rights violations;`}</li>
            <li>{`export, sanctions, procurement, anti-corruption, or government compliance violations;`}</li>
            <li>{`biological, environmental, chemical, or biosecurity misuse;`}</li>
            <li>{`your violation of these Terms;`}</li>
            <li>{`your violation of law;`}</li>
            <li>{`your representations to customers, agencies, partners, or third parties;`}</li>
            <li>{`your use of Data for targeting, navigation, safety-critical, or restricted purposes;`}</li>
            <li>{`claims that your data, systems, configurations, modifications, or integrations infringe third-party rights.`}</li>
          </ul>
          <h3 id="sub-38-2">{`38.2 Procedure`}</h3>
          <p>{`Mycosoft may control defense and settlement of any claim. You may not settle a claim imposing obligations on Mycosoft without written consent.`}</p>
          <h2 id="section-39">{`39. Term, Termination, Suspension, Device Recovery, and Post-Termination Effects`}</h2>
          <h3 id="sub-39-1">{`39.1 Term`}</h3>
          <p>{`These Terms remain in effect while you access or use the Services.`}</p>
          <h3 id="sub-39-2">{`39.2 Termination by You`}</h3>
          <p>{`You may stop using the Services at any time, subject to payment obligations, contractual commitments, device recovery obligations, data retention, and survival provisions.`}</p>
          <h3 id="sub-39-3">{`39.3 Termination or Suspension by Mycosoft`}</h3>
          <p>{`Mycosoft may suspend or terminate access immediately if you violate these Terms, create risk, fail to pay, misuse data, misuse Devices, violate law, create security issues, engage in prohibited uses, or cause regulatory, safety, environmental, legal, or reputational risk.`}</p>
          <h3 id="sub-39-4">{`39.4 Device Disablement`}</h3>
          <p>{`Mycosoft may disable, lock, revoke credentials, deauthorize, quarantine, or require return or removal of Devices where necessary for safety, security, compliance, nonpayment, export control, sanctions, theft, compromise, or misuse.`}</p>
          <h3 id="sub-39-5">{`39.5 Survival`}</h3>
          <p>{`Sections concerning IP, data rights, disclaimers, liability, indemnity, governing law, arbitration, export controls, confidentiality, security, and accrued payment obligations survive termination.`}</p>
          <h2 id="section-40">{`40. Changes to These Terms`}</h2>
          <h3 id="sub-40-1">{`40.1 Updates`}</h3>
          <p>{`Mycosoft may update these Terms from time to time. Updated Terms become effective when posted or as otherwise stated.`}</p>
          <h3 id="sub-40-2">{`40.2 Material Changes`}</h3>
          <p>{`For material changes, Mycosoft may provide notice by website posting, email, dashboard notice, API notice, account notice, or other reasonable method.`}</p>
          <h3 id="sub-40-3">{`40.3 Continued Use`}</h3>
          <p>{`Continued use after changes become effective constitutes acceptance.`}</p>
          <h3 id="sub-40-4">{`40.4 Prior Versions`}</h3>
          <p>{`Mycosoft may archive prior versions but is not required to maintain public access to all versions.`}</p>
          <h2 id="section-41">{`41. Governing Law, Jurisdiction, Arbitration, Class Action Waiver, Jury Trial Waiver, and Equitable Relief`}</h2>
          <h3 id="sub-41-1">{`41.1 Governing Law`}</h3>
          <p>{`These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law rules, except where non-waivable law requires otherwise.`}</p>
          <h3 id="sub-41-2">{`41.2 Internal Affairs`}</h3>
          <p>{`Claims concerning Mycosoft’s internal affairs, fiduciary duties, corporate governance, stockholder rights, officer or director duties, corporate records, or the Delaware General Corporation Law are subject to Delaware law and the applicable forum provisions in Mycosoft’s governing documents.`}</p>
          <h3 id="sub-41-3">{`41.3 California Operations`}</h3>
          <p>{`California law may apply to California consumers, California privacy matters, California LLC operations, or California non-waivable statutory rights where required by law. Nothing in these Terms waives non-waivable California rights.`}</p>
          <h3 id="sub-41-4">{`41.4 Arbitration`}</h3>
          <p>{`Except for excluded claims, any dispute arising from or relating to these Terms or the Services will be resolved by binding arbitration under the Federal Arbitration Act and the rules of the American Arbitration Association or another mutually agreed arbitration provider.`}</p>
          <h3 id="sub-41-5">{`41.5 Arbitration Location`}</h3>
          <p>{`Unless otherwise required by law, arbitration will take place in Delaware, California, or remotely, as Mycosoft elects, subject to applicable consumer-law requirements.`}</p>
          <h3 id="sub-41-6">{`41.6 Excluded Claims`}</h3>
          <p>{`The following claims are excluded from arbitration: intellectual property claims, trade secret claims, unauthorized access claims, security claims, export-control enforcement, sanctions enforcement, device recovery, injunctive relief, small claims court matters, and claims that cannot legally be arbitrated.`}</p>
          <h3 id="sub-41-7">{`41.7 Class Action Waiver`}</h3>
          <p>{`You and Mycosoft waive the right to participate in class actions, collective actions, representative actions, private attorney general actions, or mass arbitration proceedings to the maximum extent permitted by law.`}</p>
          <h3 id="sub-41-8">{`41.8 Jury Trial Waiver`}</h3>
          <p>{`You and Mycosoft waive the right to a jury trial to the maximum extent permitted by law.`}</p>
          <h3 id="sub-41-9">{`41.9 Equitable Relief`}</h3>
          <p>{`Mycosoft may seek injunctive, equitable, or emergency relief in any court of competent jurisdiction to protect intellectual property, trade secrets, security, Devices, systems, data, brand assets, confidential information, regulatory compliance, or safety.`}</p>
          <h3 id="sub-41-10">{`41.10 Forum`}</h3>
          <p>{`Subject to arbitration and non-waivable law, disputes may be brought in Delaware state or federal courts. You consent to jurisdiction and venue in those courts.`}</p>
          <h2 id="section-42">{`42. International Use, Extraterritorial Operations, High Seas, Foreign Law, and Conflict of Laws`}</h2>
          <h3 id="sub-42-1">{`42.1 International Use`}</h3>
          <p>{`You are responsible for compliance with all laws applicable where you access, deploy, operate, export, import, transmit, process, or use the Services.`}</p>
          <h3 id="sub-42-2">{`42.2 Foreign Law`}</h3>
          <p>{`Foreign jurisdictions may regulate drones, sensors, biological sampling, environmental monitoring, encryption, radio transmission, AI systems, location data, vessel tracking, aircraft tracking, public-sector data, defense technology, and field devices differently. You are responsible for compliance.`}</p>
          <h3 id="sub-42-3">{`42.3 High Seas`}</h3>
          <p>{`Operations in international waters remain subject to applicable law, including flag state law, U.S. law applicable to U.S. persons and entities, international maritime rules, sanctions, export controls, environmental law, port-state control, insurance rules, and contract requirements.`}</p>
          <h3 id="sub-42-4">{`42.4 Conflict`}</h3>
          <p>{`If foreign law conflicts with these Terms, you must stop using the Services in the affected jurisdiction unless Mycosoft provides written authorization.`}</p>
          <h3 id="sub-42-5">{`42.5 No Circumvention`}</h3>
          <p>{`You may not use foreign locations, offshore entities, international waters, satellites, foreign vessels, foreign hosting, or third-party intermediaries to evade U.S. law, export controls, sanctions, privacy laws, safety rules, or these Terms.`}</p>
          <h2 id="section-43">{`43. Notices, Electronic Communications, Assignment, Severability, Force Majeure, Entire Agreement, and Miscellaneous`}</h2>
          <h3 id="sub-43-1">{`43.1 Notices`}</h3>
          <p>{`Mycosoft may provide notices by email, website posting, dashboard notice, API message, device notification, account notice, or other reasonable method.`}</p>
          <h3 id="sub-43-2">{`43.2 Electronic Communications`}</h3>
          <p>{`You consent to electronic communications and electronic records.`}</p>
          <h3 id="sub-43-3">{`43.3 Assignment`}</h3>
          <p>{`You may not assign these Terms without Mycosoft’s written consent. Mycosoft may assign these Terms to an affiliate, successor, acquirer, or in connection with merger, reorganization, financing, sale of assets, or change of control.`}</p>
          <h3 id="sub-43-4">{`43.4 Severability`}</h3>
          <p>{`If any provision is unenforceable, the remaining provisions remain effective.`}</p>
          <h3 id="sub-43-5">{`43.5 No Waiver`}</h3>
          <p>{`Failure to enforce a provision is not a waiver.`}</p>
          <h3 id="sub-43-6">{`43.6 Force Majeure`}</h3>
          <p>{`Mycosoft is not liable for delays or failures caused by events beyond reasonable control, including natural disasters, war, terrorism, cyberattacks, strikes, labor issues, pandemics, power outages, cloud outages, satellite outages, cellular outages, internet failures, regulatory action, supply-chain failures, RF interference, fires, floods, earthquakes, storms, environmental hazards, or acts of government.`}</p>
          <h3 id="sub-43-7">{`43.7 Entire Agreement`}</h3>
          <p>{`These Terms and incorporated documents are the entire agreement between you and Mycosoft for the Services, except for any signed agreement that expressly supersedes them.`}</p>
          <h3 id="sub-43-8">{`43.8 Interpretation`}</h3>
          <p>{`Headings are for convenience only. “Including” means “including without limitation.” Singular includes plural. References to law include amendments and successor laws.`}</p>
          <h3 id="sub-43-9">{`43.9 No Third-Party Beneficiaries`}</h3>
          <p>{`These Terms do not create third-party beneficiary rights except for Mycosoft affiliates and indemnified parties.`}</p>
          <h2 id="section-44">{`44. Contact Information`}</h2>
          <p>{`Questions about these Terms may be sent to: Mycosoft, Inc. Address to be added United States Email: contact@mycosoft.com Website: mycosoft.com Legal, privacy, security, procurement, and deployment notices should include sufficient detail for Mycosoft to identify the account, Device, Deployment, API key, order, project, or issue.`}</p>
          <h2 id="section-45">{`45. Supplemental Terms and Policy Attachments`}</h2>
          <p>{`The following supplemental policies may apply and are incorporated by reference when posted, linked, included in an order, or otherwise made available: Privacy Policy Data Processing Addendum Acceptable Use Policy Autonomous Systems Policy Environmental Deployment Policy Hardware Terms and Limited Warranty Device Safety Manual Public Lands and Field Deployment Policy UAS / Drone Operations Policy Maritime Deployment Policy Radio and Spectrum Use Policy Export Control and Sanctions Policy Government and Public Sector Terms CUI / Classified Data Handling Addendum VAR / Reseller / Integrator Terms Open Source Notices Security and Responsible Disclosure Policy Beta and Experimental Features Terms API Terms AI Systems and Automated Decision-Making Terms`}</p>
          <hr className="my-10" />
          <h2 id="suppl-a">{`Supplemental Policy Attachment A: Autonomous Systems Policy`}</h2>
          <h3 id="sub-a-1">{`A.1 Purpose`}</h3>
          <p>{`This policy governs autonomous agents, AI systems, device fleets, robotics, drones, maritime systems, field devices, and agentic workflows.`}</p>
          <h3 id="sub-a-2">{`A.2 Human Accountability`}</h3>
          <p>{`All autonomous systems must have a responsible human, organization, or Deployment Sponsor. No autonomous system may be deployed without a responsible party.`}</p>
          <h3 id="sub-a-3">{`A.3 Command Authority`}</h3>
          <p>{`Autonomous commands must be scoped, logged, and revocable. High-risk commands require human review unless separately authorized.`}</p>
          <h3 id="sub-a-4">{`A.4 Kill Switch`}</h3>
          <p>{`Deployments must maintain reasonable emergency stop, disablement, recovery, or containment methods appropriate to the environment.`}</p>
          <h3 id="sub-a-5">{`A.5 No Autonomous Weaponization`}</h3>
          <p>{`Autonomous weaponization is prohibited without lawful authority, separate written agreement, human oversight, and applicable legal review. Unlawful autonomous targeting is strictly prohibited.`}</p>
          <h3 id="sub-a-6">{`A.6 Agentic Contracting`}</h3>
          <p>{`Agentic negotiation tools may draft, propose, route, and log documents. They do not replace legal review.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-b">{`Supplemental Policy Attachment B: Environmental Deployment Policy`}</h2>
          <h3 id="sub-b-1">{`B.1 General Rule`}</h3>
          <p>{`Deployments must be lawful, authorized, documented, reversible where feasible, and environmentally responsible.`}</p>
          <h3 id="sub-b-2">{`B.2 Minimum Deployment File`}</h3>
          <p>{`Before deployment, Operators should maintain a deployment file including:`}</p>
          <ul>
            <li>{`site location;`}</li>
            <li>{`owner or agency authorization;`}</li>
            <li>{`operator identity;`}</li>
            <li>{`device serial numbers;`}</li>
            <li>{`purpose;`}</li>
            <li>{`duration;`}</li>
            <li>{`retrieval plan;`}</li>
            <li>{`power and radio plan;`}</li>
            <li>{`environmental risk review;`}</li>
            <li>{`privacy review;`}</li>
            <li>{`safety review;`}</li>
            <li>{`emergency contact;`}</li>
            <li>{`permits or approvals;`}</li>
            <li>{`insurance where applicable.`}</li>
          </ul>
          <h3 id="sub-b-3">{`B.3 Ground Insertion`}</h3>
          <p>{`Soil probes, anchors, stakes, rods, cables, and buried equipment may be used only with authority and utility-clearance procedures.`}</p>
          <h3 id="sub-b-4">{`B.4 Wildlife and Habitat`}</h3>
          <p>{`Operators must avoid wildlife harassment, habitat damage, pollution, invasive species spread, protected area disturbance, and unauthorized sample collection.`}</p>
          <h3 id="sub-b-5">{`B.5 Community Notice`}</h3>
          <p>{`Where deployments affect communities, farms, tribal lands, public sites, or shared spaces, Operators should provide appropriate notice, consultation, and benefit-sharing consistent with law and contract.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-c">{`Supplemental Policy Attachment C: Public Lands, Mining Claims, Grazing Allotments, and Easements`}</h2>
          <h3 id="sub-c-1">{`C.1 No Implied Public-Land Access`}</h3>
          <p>{`No Mycosoft product creates a right to access public land.`}</p>
          <h3 id="sub-c-2">{`C.2 Agency Authorization`}</h3>
          <p>{`Public-land deployments require applicable agency authorization.`}</p>
          <h3 id="sub-c-3">{`C.3 Mining Claims`}</h3>
          <p>{`Mining claims do not automatically authorize sensors, probes, Device placement, surface occupancy, ground disturbance, or environmental data collection.`}</p>
          <h3 id="sub-c-4">{`C.4 Grazing`}</h3>
          <p>{`Grazing permits, leases, allotments, or range concepts do not create a Device roaming right.`}</p>
          <h3 id="sub-c-5">{`C.5 Easements`}</h3>
          <p>{`Easements authorize only what the easement document allows.`}</p>
          <h3 id="sub-c-6">{`C.6 Removal`}</h3>
          <p>{`Devices must be removed when authorization expires, is revoked, or becomes unlawful.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-d">{`Supplemental Policy Attachment D: UAS / Drone Operations Policy`}</h2>
          <h3 id="sub-d-1">{`D.1 FAA Compliance`}</h3>
          <p>{`All UAS operations in the United States must comply with applicable FAA rules, including registration, Remote ID, Part 107, recreational rules, LAANC, DroneZone, waivers, airspace restrictions, and pilot requirements.`}</p>
          <h3 id="sub-d-2">{`D.2 No Unapproved BVLOS`}</h3>
          <p>{`Beyond visual line of sight operations require applicable authorization or waiver.`}</p>
          <h3 id="sub-d-3">{`D.3 No Unsafe Flight`}</h3>
          <p>{`Operators may not fly in a manner that endangers people, property, aircraft, wildlife, emergency operations, or restricted facilities.`}</p>
          <h3 id="sub-d-4">{`D.4 Payload Integration`}</h3>
          <p>{`Operators are responsible for payload safety, RF compliance, weight, balance, secure mounting, battery safety, and flight testing.`}</p>
          <h3 id="sub-d-5">{`D.5 Logs`}</h3>
          <p>{`Flight logs, authorization records, maintenance records, payload records, Remote ID records, and incident records must be maintained where required.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-e">{`Supplemental Policy Attachment E: Maritime Deployment Policy`}</h2>
          <h3 id="sub-e-1">{`E.1 Maritime Authorizations`}</h3>
          <p>{`Buoys, moorings, aids, underwater nodes, acoustic systems, hydrophones, and waterborne devices may require Coast Guard, state, port, Army Corps, environmental, or foreign approvals.`}</p>
          <h3 id="sub-e-2">{`E.2 Navigation Safety`}</h3>
          <p>{`Devices must not create navigation hazards.`}</p>
          <h3 id="sub-e-3">{`E.3 Marking and Lighting`}</h3>
          <p>{`Marking, lighting, AIS, reflectors, flags, beacons, or notices must comply with applicable law.`}</p>
          <h3 id="sub-e-4">{`E.4 Marine Mammals and Protected Species`}</h3>
          <p>{`Deployments must avoid harm to marine mammals, protected species, habitats, fisheries, and sensitive ecological areas.`}</p>
          <h3 id="sub-e-5">{`E.5 Retrieval`}</h3>
          <p>{`Operators must maintain retrieval, inspection, and removal plans.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-f">{`Supplemental Policy Attachment F: Export Control and Sanctions Policy`}</h2>
          <h3 id="sub-f-1">{`F.1 Screening`}</h3>
          <p>{`Users, VARs, and customers must screen end users, destinations, and end uses.`}</p>
          <h3 id="sub-f-2">{`F.2 Controlled Technology`}</h3>
          <p>{`AI, acoustic sensing, drone payloads, maritime systems, encryption, defense integrations, biological systems, and technical data may be controlled.`}</p>
          <h3 id="sub-f-3">{`F.3 No Restricted Use`}</h3>
          <p>{`Services may not be used for prohibited military, WMD, terrorist, sanctioned, surveillance, or human-rights-abusive end uses.`}</p>
          <h3 id="sub-f-4">{`F.4 Cooperation`}</h3>
          <p>{`You must cooperate with Mycosoft compliance reviews.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-g">{`Supplemental Policy Attachment G: VAR / Reseller / Integrator Terms`}</h2>
          <h3 id="sub-g-1">{`G.1 Written Appointment`}</h3>
          <p>{`VAR status requires written appointment.`}</p>
          <h3 id="sub-g-2">{`G.2 Territory and Scope`}</h3>
          <p>{`VAR rights are limited to the territory, products, customers, and scope stated in writing.`}</p>
          <h3 id="sub-g-3">{`G.3 No Modification`}</h3>
          <p>{`VARs may not modify Terms, warranties, prices, compliance obligations, or technical representations unless authorized.`}</p>
          <h3 id="sub-g-4">{`G.4 End User Terms`}</h3>
          <p>{`VARs must ensure end users accept applicable Mycosoft terms.`}</p>
          <h3 id="sub-g-5">{`G.5 Audit`}</h3>
          <p>{`Mycosoft may audit VAR compliance, sales records, deployment records, export records, and customer records.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-h">{`Supplemental Policy Attachment H: Government and Public Sector Terms`}</h2>
          <h3 id="sub-h-1">{`H.1 Government Contracting`}</h3>
          <p>{`Government orders must be in writing and signed or accepted through an authorized procurement channel.`}</p>
          <h3 id="sub-h-2">{`H.2 No Classified Public Use`}</h3>
          <p>{`Classified or CUI data must not be placed in public Services.`}</p>
          <h3 id="sub-h-3">{`H.3 CUI/IL Environments`}</h3>
          <p>{`CUI, IL4, IL5, classified, FedRAMP, or agency-specific controls require separate written authorization.`}</p>
          <h3 id="sub-h-4">{`H.4 No Unaccepted Clauses`}</h3>
          <p>{`No procurement clauses apply unless accepted in writing.`}</p>
          <h3 id="sub-h-5">{`H.5 Audit and Records`}</h3>
          <p>{`Government deployments may require audit logs, chain-of-custody, device identity, operator identity, data lineage, and retention controls.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-i">{`Supplemental Policy Attachment I: AI Systems and Automated Decision-Making Terms`}</h2>
          <h3 id="sub-i-1">{`I.1 AI Transparency`}</h3>
          <p>{`Users must disclose AI interaction where required.`}</p>
          <h3 id="sub-i-2">{`I.2 Human Review`}</h3>
          <p>{`Significant decisions require human review unless lawfully exempt.`}</p>
          <h3 id="sub-i-3">{`I.3 No Rights-Impacting Sole Reliance`}</h3>
          <p>{`AI Outputs must not be the sole basis for decisions affecting legal rights, safety, benefits, employment, credit, housing, healthcare, law enforcement, or public access.`}</p>
          <h3 id="sub-i-4">{`I.4 Risk Assessments`}</h3>
          <p>{`Users are responsible for required risk assessments for AI or automated decision-making uses.`}</p>
          <h3 id="sub-i-5">{`I.5 AI Logs`}</h3>
          <p>{`AI interactions may be logged for audit, safety, security, training, and compliance.`}</p>
          <hr className="my-10" />
          <h2 id="suppl-j">{`Supplemental Policy Attachment J: Open Source Notice`}</h2>
          <h3 id="sub-j-1">{`J.1 Separate Licenses`}</h3>
          <p>{`Open-source code is governed by its own license.`}</p>
          <h3 id="sub-j-2">{`J.2 No Trademark License`}</h3>
          <p>{`Open-source licenses do not grant trademark rights.`}</p>
          <h3 id="sub-j-3">{`J.3 No Hardware License`}</h3>
          <p>{`Open-source software does not license hardware designs unless expressly stated.`}</p>
          <h3 id="sub-j-4">{`J.4 Security`}</h3>
          <p>{`Public source code may be released for transparency and security without releasing proprietary firmware, hardware, or backend systems.`}</p>
          <hr className="my-10" />
          <p className="text-center font-semibold">{`End of Terms of Service.`}</p>
        </article>
      </div>
    </div>
  )
}
