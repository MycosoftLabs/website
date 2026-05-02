"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, Download, Share2, AlertCircle } from "lucide-react"
import type { Device } from "@/lib/devices"
import { Network, Shield, Zap } from "lucide-react"
import {
  NeuCard,
  NeuCardContent,
  NeuButton,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { deviceHeroVideoSources } from "@/lib/asset-video-sources"

interface DeviceDetailsProps {
  device: Device
}

export function DeviceDetails({ device }: DeviceDetailsProps) {
  const videoSectionRef = useRef<HTMLDivElement>(null)
  const [videoError, setVideoError] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const deviceVideoSources = device.video
    ? deviceHeroVideoSources(device.video)
    : []

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [id]: true,
    }))
  }

  return (
    <NeuromorphicProvider>
    <div className="relative min-h-dvh bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden">
      <>
          {/* Hero — centered column width matches Hyphae / Alarm device pages */}
          <section className="relative pt-8 pb-12 md:pb-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
                <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl shadow-lg ring-1 ring-slate-200/80 dark:ring-white/10 lg:max-w-none">
                  <Image
                    src={
                      imageErrors["main"]
                        ? "/placeholder.svg?height=600&width=600&text=Device+Image"
                        : device.image ||
                          "/placeholder.svg?height=600&width=600&text=Device+Image"
                    }
                    alt={device.name}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 600px"
                    onError={() => handleImageError("main")}
                  />
                </div>
                <div className="mx-auto max-w-xl space-y-4 text-center lg:mx-0 lg:max-w-none lg:text-left">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                      {device.name}
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-300">{device.tagline}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                    <NeuBadge variant="default">{device.status}</NeuBadge>
                    {device.price > 0 ? (
                      <NeuBadge variant="default" className="border border-gray-300 dark:border-gray-600">
                        ${device.price}
                      </NeuBadge>
                    ) : null}
                  </div>
                  <p className="mx-auto max-w-prose leading-relaxed text-slate-600 dark:text-slate-300 lg:mx-0">
                    {device.description}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 pt-2 lg:justify-start">
                    <NeuButton variant="primary">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      {device.status === "In Stock"
                        ? "Buy Now"
                        : device.status === "Pre-order"
                          ? "Pre-order Now"
                          : "Notify Me"}
                    </NeuButton>
                    <NeuButton variant="default">
                      <Download className="mr-2 h-5 w-5" />
                      Download Specs
                    </NeuButton>
                    <NeuButton variant="default" className="min-h-[44px] min-w-[44px] p-2" aria-label="Share">
                      <Share2 className="h-5 w-5" />
                    </NeuButton>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Video Section — data-over-video for theme-aware text over dark video */}
          <section ref={videoSectionRef} className="relative mt-4 min-h-[80vh] w-full overflow-hidden md:mt-8" data-over-video>
            {!videoError && deviceVideoSources.length > 0 ? (
              <>
                <AutoplayVideo
                  src={deviceVideoSources[0]}
                  sources={deviceVideoSources}
                  className="absolute inset-0 h-full w-full object-cover"
                  encodeSrc
                />
                <div className="absolute inset-0 bg-black/50" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center text-white">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12" />
                  <p className="text-xl">Video unavailable</p>
                </div>
              </div>
            )}
            <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl space-y-6 text-center">
                <h2 className="device-hero-title text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {device.videoTitle || `Discover the ${device.name}`}
                </h2>
                <p className="device-hero-subtitle text-lg leading-relaxed text-white/90 sm:text-xl">
                  {device.videoDescription || `Experience the future of technology with ${device.name}.`}
                </p>
                <NeuButton variant="default" className="device-cta-over-video border border-white/30 bg-black/20 hover:bg-black/40">
                  Learn More
                </NeuButton>
              </div>
            </div>
          </section>
      </>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="overview" className="space-y-8 md:space-y-10">
          <div className="flex justify-center w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 h-auto p-1">
              <TabsTrigger value="overview" className="min-h-[44px]">
                Overview
              </TabsTrigger>
              <TabsTrigger value="features" className="min-h-[44px]">
                Features
              </TabsTrigger>
              <TabsTrigger value="specs" className="min-h-[44px]">
                Specs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-8 focus-visible:outline-none">
            <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                <NeuCard key={`${feature.title}-${index}`}>
                  <NeuCardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">{feature.title}</h3>
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {feature.title === "Ecosystem Integration"
                        ? "Connects with other Mycosoft devices"
                        : feature.description}
                    </p>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-12 md:space-y-16 focus-visible:outline-none">
            <div className="grid gap-12 md:gap-16 max-w-6xl mx-auto">
              {device.detailedFeatures.map((feature, index) => (
                <motion.div
                  key={`${feature.title}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center"
                >
                  <div className="space-y-4 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.bulletPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 justify-center md:justify-start text-left">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
                          <span className="text-slate-600 dark:text-slate-300">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative aspect-square max-w-lg mx-auto md:max-w-none w-full rounded-xl overflow-hidden ring-1 ring-slate-200/80 dark:ring-white/10">
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
                      sizes="(max-width: 768px) 100vw, 400px"
                      onError={() => handleImageError(`feature-${index}`)}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="specs" className="space-y-8 focus-visible:outline-none">
            <NeuCard className="max-w-3xl mx-auto border-slate-200/80 dark:border-white/10">
              <NeuCardContent className="pt-6 px-4 sm:px-6">
                <h3 className="font-semibold text-lg mb-6 text-center text-slate-900 dark:text-white">
                  Technical Specifications
                </h3>
                <div className="grid gap-4">
                  {Object.entries(device.specifications).map(([key, value], index) => (
                    <div
                      key={`spec-${index}`}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 py-3 border-b border-slate-100 dark:border-white/10 last:border-0"
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-100">{key}</div>
                      <div className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">{value}</div>
                    </div>
                  ))}
                </div>
              </NeuCardContent>
            </NeuCard>
          </TabsContent>
        </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-200 dark:border-white/10 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Ready to get started?</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Join the future of{" "}
              {device.id === "alarm" ? "environmental safety" : "fungal intelligence"}{" "}
              with {device.name}.{" "}
              {device.status === "In Stock" ? "Order now" : device.status === "Pre-order" ? "Pre-order now" : "Sign up"}{" "}
              to be among the first to experience this groundbreaking technology.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center max-w-md mx-auto sm:max-w-none">
            <NeuButton variant="primary" className="w-full sm:w-auto min-h-[48px] py-4 px-8 text-base">
              {device.status === "In Stock" ? "Buy Now" : device.status === "Pre-order" ? "Pre-order Now" : "Notify Me"}
            </NeuButton>
            <NeuButton variant="default" className="w-full sm:w-auto min-h-[48px] py-4 px-8 text-base">
              Contact Sales
            </NeuButton>
          </div>
        </div>
      </section>
    </div>
    </NeuromorphicProvider>
  )
}

