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
    name: "RJ Ricasata",
    role: "Founder & CFO",
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
]
