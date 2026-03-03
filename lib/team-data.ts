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
  // Social & contact
  linkedin?: string
  xUrl?: string
  github?: string
  medium?: string
  portfolio?: string
  email?: string
  website?: string
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
    role: "Business Development Lead",
    slug: "garret-baquet",
    bio: "Contracted Business Development Lead driving partnerships, market strategy, and growth for Mycosoft's biological computing and environmental intelligence platforms.",
    description: `Garret Baquet serves as Mycosoft's contracted Business Development Lead, driving strategic partnerships, market development, and commercial growth across the company's biological computing and environmental intelligence platforms. He brings deep expertise in technology commercialization and works to connect Mycosoft's hardware, software, and AI capabilities with defense, research, and enterprise customers.`,
    image: "/assets/team/garret-baquet.png",
    linkedin: "https://www.linkedin.com/in/garret-baquet",
    xUrl: "https://x.com/garretbaquet",
    github: "https://github.com/garretbaquet",
    location: "San Francisco, CA",
    achievements: [
      "Contracted Business Development Lead at Mycosoft",
      "Driving partnerships across defense, research, and enterprise sectors",
      "Developing commercial strategy for biological computing platforms",
      "Connecting Mycosoft hardware and AI capabilities to market",
      "Supporting OEI and NatureOS commercial deployments",
    ],
    interviews: [
      {
        title: "Building the MycoBrain: Edge AI for Biological Sensing",
        publication: "Embedded Computing Design",
        date: "2025-10-15",
        url: "#",
        type: "article",
      },
      {
        title: "LoRa Mesh Networks in Environmental Defense Applications",
        publication: "IEEE Spectrum",
        date: "2025-11-20",
        url: "#",
        type: "article",
      },
      {
        title: "From Mycelium to Machine: Hardware at the Bio-Digital Edge",
        publication: "Hackaday Podcast",
        date: "2025-09-28",
        url: "#",
        type: "podcast",
      },
    ],
  },
  {
    name: "RJ Ricasata",
    role: "Founder & Board Director",
    slug: "rj-ricasata",
    bio: "Co-Founder and second member of Mycosoft's Board of Directors, with deep expertise in blockchain QA, distributed systems, and enterprise operations.",
    description: `RJ Ricasata is a Co-Founder of Mycosoft and serves as the second member of the company's Board of Directors, providing board-level governance, strategic oversight, and accountability. With deep experience in blockchain QA, distributed systems, and enterprise operations, RJ brings a systems-thinking perspective to Mycosoft's direction and ensures disciplined long-term execution across the company's hardware, cloud, and AI platforms.`,
    image: "/assets/team/rj-ricasata.png",
    linkedin: "https://www.linkedin.com/in/rj-ricasata",
    xUrl: "https://x.com/rjricasata",
    location: "San Francisco, CA",
    achievements: [
      "Co-Founder of Mycosoft — Board of Directors (second member)",
      "Deep expertise in blockchain QA and distributed systems",
      "Board-level governance and strategic oversight",
      "Systems integration across device networks and cloud infrastructure",
      "Enterprise operations and disciplined execution across hardware and AI platforms",
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
    role: "Software Engineer",
    slug: "alberto-septien",
    bio: "Contracted Software Engineer architecting MINDEX, Mycosoft's global fungal intelligence database, and the data pipelines that power species-scale biological research.",
    description: `Alberto Septien is a contracted Software Engineer who builds the data infrastructure that powers Mycosoft's research and intelligence platforms. He architects MINDEX — the world's largest fungal species database — and creates the ingestion, processing, and API systems that deliver species-scale biological data to researchers, defense systems, and NatureOS. Alberto's work underpins every system that depends on accurate, real-time mycological intelligence.`,
    image: "/assets/team/alberto-septien.png",
    linkedin: "https://www.linkedin.com/in/alberto-septien",
    github: "https://github.com/albertoseptien",
    medium: "https://medium.com/@albertoseptien",
    location: "San Francisco, CA",
    achievements: [
      "Architected MINDEX — 1M+ species database",
      "Built ETL pipelines from GBIF, iNaturalist, and field sensors",
      "Developed unified species API for NatureOS and OEI",
      "Created data systems supporting defense and scientific platforms",
      "Scaled mycological intelligence infrastructure globally",
    ],
    interviews: [
      {
        title: "Building the World's Largest Fungal Intelligence Database",
        publication: "Towards Data Science",
        date: "2025-10-28",
        url: "#",
        type: "article",
      },
      {
        title: "ETL Pipelines for Biological Data at Scale",
        publication: "Medium — Data Engineering Weekly",
        date: "2025-09-14",
        url: "#",
        type: "article",
      },
    ],
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
