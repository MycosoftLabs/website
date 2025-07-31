"use client"
import { Card } from "@/components/ui/card"
import Image from "next/image"
import { ParallaxSection } from "@/components/parallax-section"
import { motion } from "framer-motion"
import { MotionCard } from "@/components/motion-card"
import { MotionContent } from "@/components/motion-content"

const technologies = [
  {
    title: "Materials from Mycelium",
    description:
      "Mycosoft focuses on the development of sustainable materials derived from mycelium. These materials can be used as eco-friendly alternatives to plastics, packaging, and even construction materials. Our research explores the incredible versatility of mycelium as a foundation for future innovations.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/materials%20from%20mycelium'-Zq3b3VgIAcDLm54IGuDhxzmZjcpBqC.webp",
  },
  {
    title: "Programming of Fungi",
    description:
      "By tapping into the natural electrical activity of fungi, Mycosoft is developing ways to process and interpret these bioelectric signals. This involves creating interfaces and devices that can read, amplify, and program fungi's electrical responses for various applications. The goal is to integrate fungal networks into the world of electronic systems.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/programming%20of%20fungi-A8i9CFcUQZu1rK4R3DVaaP5wR9H0zI.webp",
  },
  {
    title: "Hydrocarbon Material Science",
    description:
      "We are exploring the role of fungi in breaking down hydrocarbons and their potential for environmental remediation. In parallel, food fungi are being studied for their ability to be fed and programmed to enhance biological computing processes. This unique intersection of fungi and material science opens new frontiers in sustainability.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hydrocarbon%20material%20science-wcEO75pjUfwXiebntL6AGEGvg4fPf2.webp",
  },
  {
    title: "Environmental Monitoring",
    description:
      "Mycosoft is building devices designed for studying nature and fungi growth in their natural habitats. These smart sensors will monitor real-time environmental data like temperature, humidity, and CO2 levels. The goal is to create a global network for studying fungal behavior and environmental health.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/enviornmental%20monitoring-ErgsKkzWy106AEq6Ak8G1GrpLHtyTu.webp",
  },
  {
    title: "Smart Lab Equipment",
    description:
      "In laboratory environments, our technology aims to automate and smartly monitor the growth and health of fungi in petri dishes and farm environments. By incorporating data-gathering sensors and AI-powered tools, we aim to improve precision and efficiency in scientific research and commercial farming.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/smart%20lab%20equipment-z3U2lh0DJDiLs1nRgfkfFyhWTfuroY.webp",
  },
  {
    title: "Biological Computing",
    description:
      "One of Mycosoft's long-term visions is to grow biological computing components from mycelium and fungi. This includes developing organic capacitors, batteries, transistors, resistors, and other essential electronic components. Our goal is to use mycelium as a sustainable alternative for growing and building next-generation hardware.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/biological%20computing-oqSPxCwmNWtBJ4fQ91qWdTmQDPyMYL.webp",
  },
]

export default function AboutClient() {
  return (
    <div className="container py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Add animated banner */}
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="relative h-[400px] w-screen -ml-[50vw] left-1/2 right-1/2 -mt-6 overflow-hidden"
        >
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rs=w_1160,h_663-ESVi80C1sa4fkioBNtFcVtPlY1TkSq.webp"
            alt="Digital illustration of a mushroom merging with circuit board patterns"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
        </motion.div>

        <h1 className="text-4xl font-bold mb-8">About Mycosoft</h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-xl text-muted-foreground mb-8">
            Mycosoft is pioneering the integration of fungal intelligence with modern technology, creating a new
            paradigm for sustainable computing and environmental solutions.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">Mycelium Is The New Silicon</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/intelligence-fongique-scaled-e1632953070192.jpg-QcSkd9zn4uJrg5TC8gwWf8IOlxQiVj.jpeg"
                alt="Bioluminescent mycelial networks visualization"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-4">What Is Mycelium</h3>
              <p className="text-muted-foreground">
                Mycelium is the intricate underground network of fungal threads that connect ecosystems, acting as
                nature's biological internet. It plays a vital role in nutrient cycling, communication between plants,
                and environmental health.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
            <div className="flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-4">Mycology Technology Using Mycelium</h3>
              <p className="text-muted-foreground">
                Mycosoft's Mycology Technology harnesses the power of mycelium—the root network of fungi—to develop
                sustainable materials and innovative biological computing solutions. Mycosoft aims to bridge the gap
                between biology and technology by integrating mycelial networks with advanced sensors and electronics,
                creating eco-friendly devices like Mushroom One that monitor and interact with the natural environment.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-square rounded-lg overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20220324_143121_323.jpg-cphIZ5pntD4qD7iMr7TVIpjrGONH3S.webp"
                  alt="Laboratory setup with electronic sensors on mushroom"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-square rounded-lg overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/PXL_20241213_012410908.jpg-g6CqHJf7cfQPMRBbNIfFnb84vHNXrK.jpeg"
                  alt="Biocomputing device with fungal specimen"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          <h3 className="text-xl font-bold mt-8 mb-4">Why We Use Mycelium</h3>
          <Card className="p-6 bg-primary/5 border-primary/10 mb-12">
            <h4 className="text-lg font-semibold mb-4">Mycosoft Laboratory - Mushroom Machines</h4>
            <p className="text-muted-foreground">
              At Mycosoft, we harness the extraordinary properties of mycelium to create a seamless interface between
              biological systems and computers. Mycelium, the intricate network of fungal threads beneath the soil,
              functions as nature's ultimate connector, akin to a UART or USB port for all organisms on Earth. This
              biological marvel acts as an electrical conduit, efficiently transmitting signals across vast distances,
              similar to a nervous system. It also serves as a circulatory network, distributing nutrients and
              chemicals, much like a digestive system and vascular network combined. Mycelium's ability to process and
              respond to environmental stimuli positions it as a brain-like entity, capable of complex decision-making
              and adaptation. Its chemical composition allows it to act as a natural computer, processing information
              through biochemical pathways. By leveraging these multifaceted capabilities, we transform mycelium into a
              living interface for advanced computing, enabling unprecedented integration and interaction with the
              natural world.
            </p>
          </Card>

          <p className="text-muted-foreground mb-12">
            At Mycosoft, we harness mycelium as the foundation of our technology, similar to how Intel uses silicon for
            processors. Mycelium's natural conductivity, responsiveness to environmental signals, and adaptability make
            it the perfect medium for creating biological computers, environmental sensors, and smart systems. By
            integrating mycelium into hardware, we're pioneering a new wave of bio-computing, capable of interacting
            with nature in ways traditional technology cannot.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-8">What We Do</h2>

          <div className="grid gap-12">
            {technologies.map((tech, index) => (
              <ParallaxSection key={tech.title}>
                <MotionCard index={index}>
                  <div className="relative aspect-video md:aspect-square">
                    <Image
                      src={tech.image || "/placeholder.svg"}
                      alt={tech.title}
                      fill
                      className="object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">{tech.title}</h3>
                    <p className="text-muted-foreground">{tech.description}</p>
                  </div>
                </MotionCard>
              </ParallaxSection>
            ))}
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-4">Our Mission</h2>
          <p>
            We're dedicated to understanding and harnessing the incredible potential of fungal networks. Our work spans
            from developing groundbreaking mycological technologies to creating practical applications that benefit both
            humanity and the environment.
          </p>

          <h3 className="text-xl font-bold mt-8 mb-4">Founder</h3>
          <div className="grid md:grid-cols-[2fr,3fr] gap-6 mb-8">
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/morgan-rockwell-mycosoft-founder.jpg"
                alt="Morgan Rockwell working with mycelium networks"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-muted-foreground">
                Founded in 2014, our founder, Morgan Rockwell, made a groundbreaking advancement by being one of the
                first people on the planet to connect mushrooms directly to computers. Utilizing the Internet of Things,
                Bitcoin, and ECG sensors, Morgan pioneered the integration of biological systems with digital
                technology. This innovative approach laid the foundation for Mycosoft, driving our mission to merge
                advanced computing with the natural world. Morgan's early work in linking mycelium networks to computer
                systems has positioned Mycosoft at the forefront of developing biological computers, pushing the
                boundaries of environmental monitoring and sustainable technology.
              </p>
            </div>
          </div>

          <h3 className="text-xl font-bold mt-12 mb-4">Our Future</h3>
          <Card className="p-6 bg-primary/5 border-primary/10">
            <MotionContent>
              <p className="text-muted-foreground">
                Looking ahead, Mycosoft is dedicated to the ambitious goal of building the world's first biological
                computer. This revolutionary device will harness the natural intelligence and connectivity of mycelium,
                offering transformative benefits in environmental monitoring, data processing, and sustainable
                technology. Our future-focused vision aims to unlock new levels of interaction between biological
                systems and advanced computing, creating a harmonious blend of nature and innovation. The biological
                computer will not only enhance our understanding of the environment but also pave the way for
                groundbreaking applications in various industries, driving Mycosoft's mission to lead the way in
                eco-friendly technological advancements.
              </p>
            </MotionContent>
          </Card>

          <h2 className="text-2xl font-bold mt-12 mb-4">Innovation Through Nature</h2>
          <p>
            By studying how fungi process information and communicate, we're developing new approaches to computing,
            environmental monitoring, and biological data processing. Our technology mimics nature's most efficient
            networks to create more sustainable solutions.
          </p>

          <div className="grid md:grid-cols-2 gap-8 my-12">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-2">Research Focus</h3>
              <ul className="space-y-2">
                <li>• Fungal network intelligence</li>
                <li>• Biocomputing systems</li>
                <li>• Environmental monitoring</li>
                <li>• Sustainable technology</li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-2">Technology Areas</h3>
              <ul className="space-y-2">
                <li>• Mycelial computing</li>
                <li>• Fungal sensors</li>
                <li>• Bioremediation</li>
                <li>• Natural algorithms</li>
              </ul>
            </Card>
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-4">Our Commitment</h2>
          <p>
            We're committed to developing technology that works in harmony with nature. Our devices and applications are
            designed to be environmentally conscious, using minimal resources while maximizing their positive impact on
            the world.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">Join Our Journey</h2>
          <p>
            Whether you're a researcher, developer, or enthusiast, there are many ways to get involved with Mycosoft.
            Explore our devices, try our applications, or contribute to our growing knowledge base about fungal
            intelligence.
          </p>
        </div>
      </div>
    </div>
  )
}
