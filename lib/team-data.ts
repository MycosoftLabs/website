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
    role: "Founder & CEO",
    slug: "morgan-rockwell",
    bio: "Mycologist, systems architect, and early Bitcoin pioneer building biological-digital infrastructure at the intersection of fungi, AI, and environmental intelligence.",
    description: `Morgan Rockwell is a mycologist, systems architect, and early Bitcoin pioneer who builds biological-digital infrastructure at the intersection of fungi, AI, and environmental intelligence. He founded Mycosoft to transform mycelial networks into real-time sensing and computation platforms, leading development of NatureOS, the Fungal Computer Interface (FCI), and the Mushroom 1 device stack. Morgan previously built blockchain-based financial systems and now focuses on unifying biological signal processing with secure cloud architectures for defense and environmental applications.`,
    image: "/assets/team/morgan-rockwell.png",
    linkedin: "https://www.linkedin.com/in/morgan-rockwell",
    xUrl: "https://x.com/morganrockwell",
    medium: "https://medium.com/@morganrockwell",
    website: "https://mycosoft.com",
    location: "San Francisco, CA",
    achievements: [
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
    role: "Chief Technology Officer & Co-Founder",
    slug: "garret-baquet",
    bio: "Embedded systems architect and edge AI engineer leading MycoBrain, LoRa mesh, and sensor fusion systems for Operational Environmental Intelligence.",
    description: `Garret Baquet leads embedded systems architecture, edge AI integration, and custom PCB development for Mycosoft's device ecosystem. He architects the MycoBrain platform, LoRa mesh communications, and sensor fusion systems powering Operational Environmental Intelligence (OEI). Garret bridges low-level electronics with high-level AI orchestration to deliver rugged, field-ready biological computing hardware.`,
    image: "/assets/team/garret-baquet.png",
    linkedin: "https://www.linkedin.com/in/garret-baquet",
    xUrl: "https://x.com/garretbaquet",
    github: "https://github.com/garretbaquet",
    location: "San Francisco, CA",
    achievements: [
      "Architected the MycoBrain edge computing platform",
      "Designed LoRa mesh communications for field deployment",
      "Built sensor fusion systems for OEI",
      "Developed custom PCB hardware for the Mycosoft device stack",
      "Bridged embedded firmware with cloud AI orchestration",
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
    role: "Chief Operating Officer & Co-Founder",
    slug: "rj-ricasata",
    bio: "Operations leader with blockchain QA and distributed systems expertise, scaling MYCA's multi-agent automation and device networks from lab to field.",
    description: `RJ Ricasata oversees operational strategy, deployment execution, and systems integration across Mycosoft's hardware and cloud infrastructure. With deep experience in blockchain QA, distributed systems, and enterprise operations, he ensures that MYCA's multi-agent automation and device networks scale reliably from lab to field. RJ drives disciplined execution across firmware, DevOps, and manufacturing workflows.`,
    image: "/assets/team/rj-ricasata.png",
    linkedin: "https://www.linkedin.com/in/rj-ricasata",
    xUrl: "https://x.com/rjricasata",
    location: "San Francisco, CA",
    achievements: [
      "Scaled Mycosoft hardware and cloud operations globally",
      "Deep expertise in blockchain QA and distributed systems",
      "Ensures reliable deployment of MYCA multi-agent automation",
      "Drives execution across firmware, DevOps, and manufacturing",
      "Systems integration across device networks and cloud infrastructure",
    ],
    interviews: [
      {
        title: "Operating a Biological AI Company: Systems at Scale",
        publication: "TechCrunch",
        date: "2025-10-05",
        url: "#",
        type: "interview",
      },
      {
        title: "From Blockchain QA to Biological Computing Operations",
        publication: "CoinDesk",
        date: "2025-08-22",
        url: "#",
        type: "article",
      },
      {
        title: "Multi-Agent Systems in Production: MYCA at Mycosoft",
        publication: "The TWIML AI Podcast",
        date: "2025-12-10",
        url: "#",
        type: "podcast",
      },
    ],
  },
  {
    name: "Chris Freetage",
    role: "Hardware & Embedded Systems Engineer",
    slug: "chris-freetage",
    bio: "Hardware engineer designing the firmware, sensor arrays, and embedded systems that make Mycosoft devices field-deployable and biologically capable.",
    description: `Chris Freetage is a hardware and embedded systems engineer who translates Mycosoft's biological computing vision into deployable devices. He develops firmware, sensor integration layers, and edge computing systems for the MycoBrain platform and Mycosoft's broader device stack. Chris's work ensures devices operate reliably in demanding field conditions — from soil sensors to environmental monitoring arrays.`,
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
    bio: "Software engineer architecting MINDEX, Mycosoft's global fungal intelligence database, and the data pipelines that power species-scale biological research.",
    description: `Alberto Septien builds the data infrastructure that powers Mycosoft's research and intelligence platforms. He architects MINDEX — the world's largest fungal species database — and creates the ingestion, processing, and API systems that deliver species-scale biological data to researchers, defense systems, and NatureOS. Alberto's work underpins every system that depends on accurate, real-time mycological intelligence.`,
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
]
