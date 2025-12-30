export interface TeamMember {
  name: string
  role: string
  slug: string
  bio: string
  description?: string
  image: string
  linkedin?: string
  twitter?: string
  github?: string
  email?: string
  website?: string
  location?: string
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
}

export const teamMembers: TeamMember[] = [
  {
    name: "Morgan Rockwell",
    role: "Founder & CEO",
    slug: "morgan-rockwell",
    bio: "Pioneer in fungal-computer integration. First to connect living mushrooms to digital systems using IoT and bioelectric sensors in 2014.",
    description: `Morgan Rockwell is the visionary founder of Mycosoft, having pioneered the field of fungal-computer integration. In 2014, he became one of the first researchers to successfully connect living mycelium networks to digital systems using IoT sensors and bioelectric interfaces.

His groundbreaking work has opened new frontiers in biological computing, demonstrating that nature's most efficient information processing systems can be integrated with modern technology. Under his leadership, Mycosoft has grown from a research project into a company developing the world's first biological computer.

Morgan's vision extends beyond technology—he sees a future where computing regenerates rather than depletes the Earth, where intelligence emerges from the same networks that have sustained life for billions of years.`,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/morgan-rockwell-mycosoft-founder.jpg",
    linkedin: "#",
    twitter: "#",
    location: "San Francisco, CA",
    achievements: [
      "First to connect living fungi to computers (2014)",
      "Developed first functional bioelectric interface between mycelium and digital systems",
      "Founded Mycosoft Labs (2018)",
      "Launched MINDEX - world's largest fungal species database",
      "Led development of MycoBrain hardware platform",
      "Pioneered biological computing research"
    ],
  },
  {
    name: "Garret Baquet",
    role: "Chief Technology Officer",
    slug: "garret-baquet",
    bio: "Technology leader specializing in distributed systems, AI, and biological computing architectures.",
    description: `Garret Baquet brings deep expertise in building scalable technology platforms and distributed systems. As CTO, he leads Mycosoft's technical vision, overseeing the development of NatureOS, MYCA AI, and the infrastructure that powers our biological computing research.

His background in both traditional software engineering and emerging biological computing technologies makes him uniquely positioned to bridge the gap between silicon and mycelium. Garret is passionate about creating technology that works in harmony with nature rather than against it.`,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team-placeholder.jpg",
    linkedin: "#",
    twitter: "#",
    github: "#",
    location: "San Francisco, CA",
    achievements: [
      "Architected NatureOS platform",
      "Led MYCA AI development",
      "Designed distributed computing infrastructure",
      "Built scalable device management systems"
    ],
  },
  {
    name: "RJ Ricasata",
    role: "Chief Operating Officer",
    slug: "rj-ricasata",
    bio: "Operations leader focused on scaling Mycosoft's research, development, and product delivery.",
    description: `RJ Ricasata ensures that Mycosoft's groundbreaking research translates into real-world products and impact. As COO, he manages operations across research labs, product development, and global partnerships.

His operational excellence has been critical in scaling Mycosoft from a research project to a company shipping products worldwide. RJ is committed to building sustainable operations that support both our scientific mission and business growth.`,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team-placeholder.jpg",
    linkedin: "#",
    twitter: "#",
    location: "San Francisco, CA",
    achievements: [
      "Scaled operations across 25+ countries",
      "Established global research partnerships",
      "Led product shipping and fulfillment",
      "Built sustainable operational infrastructure"
    ],
  },
  {
    name: "Chris Freetage",
    role: "Engineer",
    slug: "chris-freetage",
    bio: "Hardware and embedded systems engineer specializing in MycoBrain development and sensor integration.",
    description: `Chris Freetage is a hardware engineer who brings Mycosoft's biological computing vision to life. He designs and develops the MycoBrain platform, integrating sensors, edge computing, and LoRa connectivity to create devices that bridge biological and digital worlds.

His expertise in embedded systems, IoT, and hardware design has been essential in creating reliable, field-deployable devices that can monitor environmental conditions and interface with mycelial networks.`,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team-placeholder.jpg",
    linkedin: "#",
    github: "#",
    location: "San Francisco, CA",
    achievements: [
      "Designed MycoBrain hardware platform",
      "Developed sensor integration systems",
      "Built edge computing capabilities",
      "Implemented LoRa connectivity"
    ],
  },
  {
    name: "Alberto Septien",
    role: "Engineer",
    slug: "alberto-septien",
    bio: "Software engineer focused on MINDEX development, data systems, and mycological database architecture.",
    description: `Alberto Septien is a software engineer who builds the data infrastructure that powers Mycosoft's research and products. He leads development of MINDEX, the world's largest fungal species database, and creates systems that process and analyze mycological data at scale.

His work ensures that researchers, mycologists, and enthusiasts worldwide have access to comprehensive, accurate information about fungal species, observations, and telemetry data.`,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team-placeholder.jpg",
    linkedin: "#",
    github: "#",
    location: "San Francisco, CA",
    achievements: [
      "Built MINDEX database architecture",
      "Developed data processing pipelines",
      "Created API systems for mycological data",
      "Scaled database to 1M+ species"
    ],
  },
]










