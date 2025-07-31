"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

export function SporeTrackerAbout() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About Spore Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Spore Tracker is a comprehensive global monitoring system that tracks fungal spore distribution in
            real-time. By combining data from our network of SporeBase devices and environmental sensors, we provide
            valuable insights into spore movement patterns, concentrations, and species distribution across the planet.
          </p>

          <div className="relative aspect-video rounded-lg overflow-hidden my-6">
            <Image
              src="/placeholder.svg?height=400&width=800&text=Spore+Tracker+Network"
              alt="Spore Tracker Network Visualization"
              fill
              className="object-cover"
            />
          </div>

          <p>
            This platform serves as a critical tool for researchers, meteorologists, biologists, mycologists, and
            government agencies to understand and predict fungal spore movement, which has significant implications for
            agriculture, public health, ecosystem management, and climate science.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="data-sources">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="technology">Technology</TabsTrigger>
        </TabsList>

        <TabsContent value="data-sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">SporeBase Network</h3>
                <p className="text-muted-foreground">
                  Our primary data source is the global network of SporeBase devices. These specialized sensors are
                  deployed in strategic locations worldwide to collect real-time data on spore concentrations, species
                  identification, and environmental conditions. Each SporeBase unit contains advanced sampling
                  technology that can identify and quantify fungal spores in the air.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Weather Data Integration</h3>
                <p className="text-muted-foreground">
                  Spore Tracker integrates with global meteorological services to incorporate real-time weather data,
                  including wind patterns, precipitation, temperature, and humidity. This integration allows for
                  accurate modeling of spore dispersal patterns and predictions of future movement.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Satellite Imagery</h3>
                <p className="text-muted-foreground">
                  We utilize satellite data to monitor large-scale environmental conditions that affect fungal growth
                  and spore release, such as vegetation health, soil moisture, and land use changes. This provides
                  valuable context for understanding spore distribution patterns.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Citizen Science</h3>
                <p className="text-muted-foreground">
                  Our platform also incorporates data from citizen scientists using the Mycosoft mobile app, allowing
                  for expanded coverage in areas without dedicated SporeBase units. Users can report fungal sightings
                  and upload samples for analysis, contributing to our global database.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Agricultural Management</h3>
                <p className="text-muted-foreground">
                  Farmers and agricultural agencies use Spore Tracker to monitor the spread of crop pathogens, allowing
                  for early intervention and targeted treatment. This helps reduce crop losses and minimize the use of
                  fungicides through precision agriculture techniques.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Public Health</h3>
                <p className="text-muted-foreground">
                  Health departments and allergists utilize our data to track allergenic and pathogenic fungal spores
                  that can affect human health. This information helps in issuing public health advisories and preparing
                  healthcare facilities for potential increases in respiratory conditions.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Military and Defense</h3>
                <p className="text-muted-foreground">
                  Defense agencies use Spore Tracker for biosecurity monitoring, tracking unusual spore patterns that
                  could indicate biological threats. The system's real-time alerts help in rapid response to potential
                  biological incidents.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Ecological Research</h3>
                <p className="text-muted-foreground">
                  Scientists and conservation organizations use our platform to study fungal biodiversity, ecosystem
                  health, and the impacts of climate change on fungal communities. This data is crucial for
                  understanding forest health and ecosystem dynamics.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Climate Science</h3>
                <p className="text-muted-foreground">
                  Climate researchers analyze long-term spore data to understand how fungal communities are responding
                  to climate change, providing valuable insights into ecosystem adaptation and potential feedback
                  mechanisms in the global carbon cycle.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technology" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technology</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">SporeBase Devices</h3>
                <p className="text-muted-foreground">
                  Our proprietary SporeBase devices use advanced air sampling technology combined with AI-powered image
                  recognition to identify and quantify fungal spores in real-time. Each unit contains environmental
                  sensors for temperature, humidity, air pressure, and wind conditions, providing comprehensive data for
                  analysis.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Mycelial Network Computing</h3>
                <p className="text-muted-foreground">
                  Spore Tracker utilizes Mycosoft's revolutionary Mycelial Network Computing architecture, which mimics
                  the distributed intelligence of fungal networks. This allows for efficient processing of massive
                  datasets and adaptive learning from environmental patterns.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Predictive Modeling</h3>
                <p className="text-muted-foreground">
                  Our platform employs sophisticated machine learning algorithms to predict spore dispersal patterns
                  based on current conditions and historical data. These models account for weather patterns, terrain,
                  and seasonal variations to provide accurate forecasts up to 72 hours in advance.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Data Visualization</h3>
                <p className="text-muted-foreground">
                  Spore Tracker features advanced visualization tools that transform complex data into intuitive,
                  interactive maps and charts. Users can explore spore concentrations, movement patterns, and
                  environmental correlations through customizable views and filters.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">API Integration</h3>
                <p className="text-muted-foreground">
                  Our platform offers robust API access for researchers and organizations to integrate Spore Tracker
                  data into their own systems and applications. This facilitates seamless data sharing and collaboration
                  across different sectors and research disciplines.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
