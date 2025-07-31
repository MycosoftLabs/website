"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { DEVICES } from "@/lib/devices"

export function DeviceGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {DEVICES.map((device) => (
        <Card key={device.id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{device.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{device.tagline}</p>
              </div>
              <Badge variant={device.status === "In Stock" ? "default" : "secondary"}>{device.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="aspect-video relative mb-6 rounded-lg overflow-hidden">
              <img
                src={
                  device.id === "alarm"
                    ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%208%2C%202025%2C%2004_02_35%20PM-uHEgjg8uigqYIix0Z34wxYEW1n4guo.png"
                    : device.image || "/placeholder.svg"
                }
                alt={device.name}
                className="object-contain w-full h-full"
              />
            </div>
            <Tabs defaultValue="overview" className="h-[200px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="deployment">Deployment</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <p className="text-sm text-muted-foreground">{device.description}</p>
              </TabsContent>
              <TabsContent value="features" className="mt-4">
                <div className="grid gap-4">
                  {device.features.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-3">
                      <feature.icon className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <h4 className="text-sm font-semibold">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="deployment" className="mt-4">
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  {device.id === "alarm" ? (
                    <>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Homes
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Schools
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Offices
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Healthcare Facilities
                      </li>
                    </>
                  ) : device.id === "mushroom-1" ? (
                    <>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Forests
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Agricultural Fields
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Research Plots
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Conservation Areas
                      </li>
                    </>
                  ) : (
                    device.deploymentTypes?.map((type) => (
                      <li key={type} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {type}
                      </li>
                    ))
                  )}
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <div className="font-bold">
              ${typeof device.price === "number" ? device.price.toFixed(2) : device.price}
            </div>
            <Button asChild>
              <Link href={`/devices/${device.id}`}>Learn More</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
