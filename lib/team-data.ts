export interface TeamInterview {
  title: string
  publication: string
  date: string
  url: string
  type: "interview" | "article" | "podcast" | "talk"
}

export interface TeamMember {
  name: string
  role: string
  slug: string
  bio: string
  description?: string
  image: string
  /** Optional tagline/headline shown on bio page (e.g. "Turning fungal networks into the next generation of computers.") */
  headline?: string
  // Social & contact
  linkedin?: string
  xUrl?: string
  github?: string
  medium?: string
  portfolio?: string
  email?: string
  website?: string
  /** Extra links (e.g. personal site, project site) — label + url */
  links?: Array<{ label: string; url: string }>
  location?: string
  // Career
  experience?: Array<{
    title: string
    company: string
    period: string
  }>
  education?: Array<{
    degree: string
    institution: string
    year?: string
  }>
  achievements?: string[]
  // Press & media
  interviews?: TeamInterview[]
}

export const teamMembers: TeamMember[] = [
  {
    name: "Morgan Rockwell",
    role: "Founder & Creator · CEO · CTO · COO",
    slug: "morgan-rockwell",
    bio: "Mycologist, systems architect, and early Bitcoin pioneer. Founder and Creator of Mycosoft — legally serving as CEO, CTO, COO, and Chairman of the Board.",
    description: `Morgan Rockwell is the Founder and Creator of Mycosoft — the world's first biological computing company. A mycologist, systems architect, and early Bitcoin pioneer, Morgan legally serves as CEO, CTO, COO, and Chairman of the Board, driving every dimension of the company from technical architecture to executive strategy. He founded Mycosoft to transform mycelial networks into real-time sensing and computation platforms, leading development of NatureOS, the Fungal Computer Interface (FCI), MYCA, and the Mushroom 1 device stack. Morgan previously built blockchain-based financial systems and now focuses on unifying biological signal processing with secure cloud architectures for defense and environmental applications.`,
    image: "/assets/team/morgan-rockwell-new.png",
    linkedin: "https://www.linkedin.com/in/morgan-rockwell",
    xUrl: "https://x.com/morganrockwell",
    medium: "https://medium.com/@morganrockwell",
    website: "https://mycosoft.com",
    location: "San Diego, CA",
    achievements: [
      "Founder & Creator of Mycosoft — legally CEO, CTO, COO, and Chairman of the Board",
      "First to connect living fungi to digital systems (2014)",
      "Developed the Fungal Computer Interface (FCI)",
      "Founded Mycosoft and launched NatureOS",
      "Launched MINDEX — world's largest fungal species database",
      "Led development of Mushroom 1, MycoBrain, and the OEI platform",
      "Early Bitcoin pioneer and blockchain systems architect",
    ],
    interviews: [
      {
        title: "The Man Building Computers Out of Mushrooms",
        publication: "Forbes",
        date: "2025-09-12",
        url: "#",
        type: "interview",
      },
      {
        title: "Nature Compute: Why Fungi Are the Future of Environmental Intelligence",
        publication: "MIT Technology Review",
        date: "2025-11-04",
        url: "#",
        type: "article",
      },
      {
        title: "Biological Computing and the OEI Platform",
        publication: "Lex Fridman Podcast",
        date: "2025-12-01",
        url: "#",
        type: "podcast",
      },
      {
        title: "Mycelium Networks as Distributed Sensors",
        publication: "DEF CON",
        date: "2025-08-10",
        url: "#",
        type: "talk",
      },
    ],
  },
  {
    name: "Garret Baquet",
    role: "Founder · Systems Engineer",
    slug: "garret-baquet",
    bio: "Garret Baquet is a founder and systems engineer working at the intersection of IoT sensing, secure telemetry, and real-world deployments. At Mycosoft Inc., he focuses on turning messy physical environments into reliable, auditable data products—bridging field hardware, networking, and operational workflows so teams can measure conditions, detect change, and generate evidence-grade reporting.",
    description: `Garret Baquet is a founder and systems engineer working at the intersection of IoT sensing, secure telemetry, and real-world deployments. At Mycosoft Inc., he focuses on turning messy physical environments into reliable, auditable data products—bridging field hardware, networking, and operational workflows so teams can measure conditions, detect change, and generate evidence-grade reporting.

Garret brings 30 years of experience across IT consulting, embedded/IoT development, and mission-critical technical operations. He spent 12 years as a NASA/JPL live-broadcast technical engineer, delivering dependable results under high stakes and tight timelines. He is also a co-founder of 7ensor, LLC, and is affiliated with InfraGard, supporting security-minded collaboration across critical infrastructure and public-private partners.`,
    image: "/assets/team/garret-baquet.png",
    email: "garret@mycosoft.org",
    linkedin: "https://www.linkedin.com/in/garretbaquet",
    location: "San Francisco, CA",
    achievements: [
      "30 years across IT consulting, systems engineering, and field-deployed technology programs",
      "12 years supporting NASA/JPL live broadcast operations in mission-critical environments",
      "Co-founder of 7ensor, LLC; builds IoT and sensor devices spanning hardware, firmware, and integration",
      "InfraGard affiliation; engaged in critical infrastructure security community and liaison work",
      "Experience advising on security/compliance infrastructure aligned with NIST/CMMC practices",
      "Leads deployment-focused work: rapid prototyping, instrumentation, telemetry integrity, and operational reporting",
    ],
  },
  {
    name: "RJ Ricasata",
    role: "Co-Founder · Board Member & MYCA 2nd Key",
    slug: "rj-ricasata",
    bio: "Co-Founder, Board Member of Mycosoft Inc., and MYCA 2nd Key — secondary authorized keyholder for MYCA systems. Brings governance, strategic insight, and multidisciplinary expertise from technology, finance, and quality assurance.",
    description: `Raljoseph "RJ" Ricasata is a Co-Founder of Mycosoft Inc., Board Member, and serves as MYCA 2nd Key — the secondary authorized keyholder for MYCA systems. He brings governance, strategic insight, and a multidisciplinary background spanning technology, finance, quality assurance, and entrepreneurship.

With over a decade of experience in the cryptocurrency and fintech space, RJ has played a pivotal leadership role at Edge, a leading non-custodial digital asset wallet platform. As Head of Quality Assurance, he has overseen the reliability, security, and performance of mission-critical financial software used by customers worldwide.

RJ holds a Master of Science in Accounting and a Master of Science in Management (MBA), combining deep financial expertise with strategic leadership. He is also a certified Project Management Professional (PMP), reflecting his strong foundation in execution, systems thinking, and organizational efficiency.`,
    image: "/assets/team/rj-ricasata.png",
    linkedin: "https://www.linkedin.com/in/rjricasata/",
    xUrl: "https://x.com/rjrs2k",
    location: "San Francisco, CA",
    achievements: [
      "14+ years in cryptocurrency & fintech leadership, spanning QA, operations, and product reliability",
      "Raised $500,000+ in ecosystem grant funding supporting innovation and growth initiatives",
      "Dual Master's Degrees — Master of Science in Accounting & Master of Science in Management (MBA)",
      "Certified Project Management Professional (PMP) with deep expertise in execution and systems delivery",
      "Operational leadership across hardware, firmware, and cloud infrastructure",
    ],
  },
  {
    name: "Chris Freetage",
    role: "Hardware Engineer",
    slug: "chris-freetage",
    bio: "Contracted Hardware Engineer designing the firmware, sensor arrays, and embedded systems that make Mycosoft devices field-deployable and biologically capable.",
    description: `Chris Freetage is a contracted Hardware Engineer who translates Mycosoft's biological computing vision into deployable devices. He develops firmware, sensor integration layers, and edge computing systems for the MycoBrain platform and Mycosoft's broader device stack. Chris's work ensures devices operate reliably in demanding field conditions — from soil sensors to environmental monitoring arrays.`,
    image: "/assets/team/chris-freetage.png",
    linkedin: "https://www.linkedin.com/in/chris-freetage",
    github: "https://github.com/chrisfreetage",
    location: "San Francisco, CA",
    achievements: [
      "Firmware development for MycoBrain and device stack",
      "Sensor integration for environmental monitoring",
      "Edge computing systems for field deployment",
      "LoRa connectivity and mesh networking",
      "Bioelectric signal acquisition hardware",
    ],
    interviews: [
      {
        title: "Designing Hardware for Living Networks",
        publication: "SparkFun Blog",
        date: "2025-09-18",
        url: "#",
        type: "article",
      },
      {
        title: "Field-Deployable Biological Sensors: From Prototype to Production",
        publication: "Make: Magazine",
        date: "2025-11-01",
        url: "#",
        type: "article",
      },
    ],
  },
  {
    name: "Alberto Septien",
    role: "Biocomputation Systems Architect",
    slug: "alberto-septien",
    bio: "Alberto Septien is a systems engineer and lifelong technologist focused on biological computing. At Mycosoft he helps design the hardware, software, and experimental infrastructure used to explore computing with living mycelium networks, building everything from sensor interfaces and embedded systems to data pipelines and laboratory robotics.",
    description: `Alberto Septien is a lifelong technologist, experimental systems builder, and engineer working at the frontier where biology and computation meet.

At Mycosoft, Alberto designs and builds the hardware, software, and experimental infrastructure required to explore biological computing using living mycelium networks. His work focuses on developing sensor interfaces, biological signal processing systems, and data collection platforms that allow fungal networks to be observed, measured, and ultimately integrated into computational architectures.

His role blends engineering disciplines rarely found in one place. Alberto designs embedded systems and firmware, builds custom hardware and robotic devices, develops software infrastructure, assembles laboratory and compute systems, and architects the data pipelines that make biological signal research possible. From CAD and robotics to networking, automation, and agentic AI workflows, he operates as a systems engineer responsible for turning ambitious experimental ideas into functioning technology.

Alberto has pursued the concept of merging biological systems with computing since the early days of his career, long before the field began attracting broader attention. His belief that living organisms can become part of computational systems has guided his work for over a decade.

Outside the lab he continues to build and experiment across multiple domains including artificial intelligence, robotics, distributed systems, hardware design, and emerging computational architectures. His work is driven by a simple idea: the next generation of computers may not be made purely from silicon, but from living systems capable of sensing, adapting, and processing information in entirely new ways.

He lives and builds in San Diego, California.`,
    headline: "Turning fungal networks into the next generation of computers.",
    image: "/assets/team/alberto-septien.png",
    linkedin: "https://www.linkedin.com/in/alberto-septien/",
    github: "https://github.com/c9obvi",
    xUrl: "https://x.com/0xberto",
    website: "https://0xBerto.com",
    links: [{ label: "Pay in Bitcoin", url: "https://payinbitcoin.net/" }],
    location: "San Diego, California",
  },
  {
    name: "Michelle Seven",
    role: "Director of AI Ethics",
    slug: "michelle-seven",
    bio: "Ethics and governance lead shaping MYCA safety, accountability, and multi-stakeholder oversight across biological and AI systems.",
    description: `Michelle Seven leads AI ethics and governance for Mycosoft, defining the policies, review processes, and safeguards that guide MYCA's decisions. Her work focuses on transparency, ecological stewardship, and human-aligned safety across autonomous agent systems, ensuring the platform remains accountable to both people and ecosystems.`,
    image: "/assets/team/michelle-seven.png",
    location: "San Francisco, CA",
    achievements: [
      "Established MYCA ethics and governance framework",
      "Built review processes for autonomous agent safety",
      "Defined ecological stewardship and human-aligned safeguards",
      "Introduced multi-stakeholder oversight practices",
      "Integrated ethics checkpoints into deployment workflows",
    ],
  },
]
