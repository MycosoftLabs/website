"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, Download, Share2, AlertCircle } from "lucide-react"
import type { Device } from "@/lib/devices"
import { Network, Shield, Zap } from "lucide-react"

interface DeviceDetailsProps {
  device: Device
}

export function DeviceDetails({ device }: DeviceDetailsProps) {
  const videoRef = useRef<HTMLDivElement>(null)
  const [videoError, setVideoError] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const { scrollYProgress } = useScroll({
    target: videoRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 1, 0.8])

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [id]: true,
    }))
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container">
        <div className="grid lg:grid-cols-2 lg:gap-12 items-center pt-6">
          <div className="relative aspect-square">
            <Image
              src={
                imageErrors["main"]
                  ? "/placeholder.svg?height=600&width=600&text=Device+Image"
                  : device.image || "/placeholder.svg?height=600&width=600&text=Device+Image"
              }
              alt={device.name}
              fill
              className="object-cover"
              priority
              unoptimized={true}
              onError={() => handleImageError("main")}
            />
          </div>
          <div className="space-y-4 px-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter">{device.name}</h1>
              <p className="text-xl text-muted-foreground">{device.tagline}</p>
            </div>
            <div className="flex gap-2">
              <Badge>{device.status}</Badge>
              <Badge variant="outline">${device.price}</Badge>
            </div>
            <p className="text-muted-foreground">{device.description}</p>
            <div className="flex gap-4 pt-4">
              <Button size="lg">
                <ShoppingCart className="mr-2 h-5 w-5" />
                {device.status === "In Stock"
                  ? "Buy Now"
                  : device.status === "Pre-order"
                    ? "Pre-order Now"
                    : "Notify Me"}
              </Button>
              <Button variant="outline" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Download Specs
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="relative min-h-[80vh] w-full overflow-hidden mt-12">
        {!videoError ? (
          <>
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              poster="/placeholder.svg?height=1080&width=1920"
              onError={() => setVideoError(true)}
            >
              <source src={device.video || ""} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="text-white text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="text-xl">Video unavailable</p>
            </div>
          </div>
        )}
        <div className="container relative z-10 mx-auto h-full py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-4xl font-bold text-white">{device.videoTitle || `Discover the ${device.name}`}</h2>
            <p className="text-xl text-white/90">
              {device.videoDescription || `Experience the future of technology with ${device.name}.`}
            </p>
            <Button size="lg" variant="outline" className="bg-black/20 border-white text-white hover:bg-black/40">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="specs">Specs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                ...device.features,
                {
                  icon: Network,
                  title: "Ecosystem Integration",
                  description: "Seamlessly connects with other Mycosoft devices and NatureOS platform",
                },
                {
                  icon: Shield,
                  title: "Data Security",
                  description: "End-to-end encryption and secure storage of all sensor data",
                },
                {
                  icon: Zap,
                  title: "Energy Efficient",
                  description: "Solar-powered with intelligent power management system",
                },
              ].map((feature, index) => (
                <Card key={`${feature.title}-${index}`}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mt-2">
                      {feature.title === "Ecosystem Integration"
                        ? "Connects with other Mycosoft devices"
                        : feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-8">
            <div className="grid gap-12">
              {device.detailedFeatures.map((feature, index) => (
                <motion.div
                  key={`${feature.title}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="grid md:grid-cols-2 gap-8 items-center"
                >
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.bulletPoints.map((point, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-muted-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={
                        device.id === "alarm" && feature.title === "Advanced Sensor Suite"
                          ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%208%2C%202025%2C%2004_16_38%20PM-POTqlChUZmLYA5zByV9LGB8bUZRJ7Z.png"
                          : imageErrors[`feature-${index}`]
                            ? "/placeholder.svg?height=400&width=600"
                            : feature.image || "/placeholder.svg?height=400&width=600"
                      }
                      alt={feature.title}
                      fill
                      className="object-contain md:object-cover p-2 md:p-0"
                      unoptimized={true}
                      onError={() => handleImageError(`feature-${index}`)}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="specs" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {Object.entries(device.specifications).map(([key, value], index) => (
                    <div key={`spec-${index}`} className="grid grid-cols-2 gap-4">
                      <div className="font-medium">{key}</div>
                      <div className="text-muted-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* CTA Section */}
      <section className="container py-24 border-t">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Ready to get started?</h2>
            <p className="text-muted-foreground">
              Join the future of {device.id === "alarm" ? "environmental safety" : "fungal intelligence"} with{" "}
              {device.name}.{" "}
              {device.status === "In Stock" ? "Order now" : device.status === "Pre-order" ? "Pre-order now" : "Sign up"}{" "}
              to be among the first to experience this groundbreaking technology.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <Button size="lg" className="flex-1">
              {device.status === "In Stock" ? "Buy Now" : device.status === "Pre-order" ? "Pre-order Now" : "Notify Me"}
            </Button>
            <Button variant="outline" size="lg" className="flex-1">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
