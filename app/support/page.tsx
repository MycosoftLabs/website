import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Headphones,
  MessageSquare,
  FileText,
  BookOpen,
  Mail,
  ChevronRight,
  Search,
  Cpu,
  Wifi,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Zap,
  Shield,
  Database,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Support Center | Mycosoft",
  description: "Get help with Mycosoft products and services. Browse our knowledge base, FAQs, and contact our support team.",
}

const supportCategories = [
  {
    icon: Cpu,
    title: "MycoBrain & Devices",
    description: "Hardware setup, firmware updates, sensor configuration",
    href: "/docs",
    articles: 24,
  },
  {
    icon: Wifi,
    title: "Connectivity",
    description: "WiFi, LoRa, Bluetooth, and network troubleshooting",
    href: "/docs",
    articles: 18,
  },
  {
    icon: Database,
    title: "MINDEX & Data",
    description: "Database queries, API integration, data export",
    href: "/docs",
    articles: 32,
  },
  {
    icon: Shield,
    title: "Account & Security",
    description: "Login issues, password reset, two-factor auth",
    href: "/docs",
    articles: 15,
  },
  {
    icon: Settings,
    title: "NatureOS",
    description: "Platform configuration, workflows, integrations",
    href: "/docs",
    articles: 28,
  },
  {
    icon: Zap,
    title: "Getting Started",
    description: "Quick start guides and tutorials for new users",
    href: "/docs",
    articles: 12,
  },
]

const popularArticles = [
  {
    title: "How to set up your MycoBrain for the first time",
    category: "Getting Started",
    views: "2.4k views",
    href: "/docs",
  },
  {
    title: "Connecting MycoBrain to your WiFi network",
    category: "Connectivity",
    views: "1.8k views",
    href: "/docs",
  },
  {
    title: "Understanding BME688 sensor readings",
    category: "Devices",
    views: "1.5k views",
    href: "/docs",
  },
  {
    title: "Troubleshooting firmware update failures",
    category: "Devices",
    views: "1.2k views",
    href: "/docs",
  },
  {
    title: "Using the MINDEX API for species lookups",
    category: "Data",
    views: "980 views",
    href: "/docs",
  },
]

const faqItems = [
  {
    question: "How do I reset my MycoBrain device?",
    answer: "Hold the reset button for 10 seconds until the LED blinks rapidly. The device will restart with factory settings while preserving your network configuration.",
  },
  {
    question: "Why is my sensor showing incorrect readings?",
    answer: "Ensure the device has been running for at least 30 minutes to allow sensor calibration. Check that the device is in a well-ventilated area away from direct sunlight or heat sources.",
  },
  {
    question: "How do I update my device firmware?",
    answer: "Go to NatureOS > Devices > Select your device > Firmware tab. Click 'Check for Updates' and follow the on-screen instructions. Keep the device powered during the update.",
  },
  {
    question: "Can I use multiple MycoBrain devices on the same network?",
    answer: "Yes, you can connect multiple devices. Each device will automatically register with your NatureOS account. Use the device manager to organize and monitor all your devices.",
  },
  {
    question: "How do I export my data from MINDEX?",
    answer: "Navigate to MINDEX > Your Data > Export. Choose your preferred format (CSV, JSON, or PDF) and date range. Large exports may take a few minutes to prepare.",
  },
]

const contactOptions = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Get help within 24-48 hours",
    action: "support@mycosoft.com",
    href: "mailto:support@mycosoft.com",
    badge: "Standard",
  },
  {
    icon: MessageSquare,
    title: "Community Forum",
    description: "Connect with other users",
    action: "Visit Forum",
    href: "/community",
    badge: "Free",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "For Pro and Enterprise users",
    action: "Contact Us",
    href: "/contact",
    badge: "Pro",
  },
]

const systemStatus = {
  overall: "operational",
  services: [
    { name: "Website", status: "operational" },
    { name: "MINDEX API", status: "operational" },
    { name: "NatureOS", status: "operational" },
    { name: "Device Registry", status: "operational" },
  ],
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 to-background z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:60px_60px] z-10" />
        
        <div className="container max-w-5xl mx-auto px-6 relative z-20 text-center">
          <Badge className="mb-6 bg-blue-500/20 text-blue-400 border-blue-500/30">
            Support Center
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            How Can We{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Help You?
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Find answers in our knowledge base, browse FAQs, or contact our support team for personalized assistance.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search for help articles, FAQs, or guides..."
              className="pl-12 h-14 text-lg bg-background/80 backdrop-blur-sm"
            />
          </div>
        </div>
      </section>

      {/* System Status Banner */}
      <section className="py-4 border-b">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">All Systems Operational</span>
            </div>
            <Link 
              href="/status" 
              className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View Status Page <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Support Categories */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {supportCategories.map((category) => (
              <Link key={category.title} href={category.href}>
                <Card className="h-full hover:border-blue-500/50 transition-colors cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <category.icon className="h-5 w-5 text-blue-500" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                    </div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm text-muted-foreground">{category.articles} articles</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Popular Articles</h2>
            <Link href="/docs">
              <Button variant="ghost" className="gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {popularArticles.map((article) => (
              <Link key={article.title} href={article.href}>
                <Card className="hover:border-blue-500/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                          <span>•</span>
                          <span>{article.views}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">FAQ</Badge>
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Quick answers to common questions about Mycosoft products and services.
            </p>
          </div>
          
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pl-11">
                  <p className="text-muted-foreground">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
            <p className="text-muted-foreground">
              Our support team is ready to assist you with any questions or issues.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {contactOptions.map((option) => (
              <Card key={option.title} className="text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-blue-500/10">
                      <option.icon className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CardTitle>{option.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{option.badge}</Badge>
                  </div>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild className="w-full">
                    <a href={option.href}>{option.action}</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
              <CardHeader>
                <BookOpen className="h-8 w-8 text-blue-500 mb-2" />
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  Comprehensive guides, API references, and technical documentation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href="/docs" className="gap-2">
                    Browse Docs <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
              <CardHeader>
                <MessageSquare className="h-8 w-8 text-green-500 mb-2" />
                <CardTitle>Contact Us</CardTitle>
                <CardDescription>
                  Get in touch with our team for partnership inquiries or feedback.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href="/contact" className="gap-2">
                    Contact Page <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
