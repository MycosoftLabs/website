import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Headphones,
  FileText,
  Mail,
  MessageSquare,
  BookOpen,
  Zap,
  Database,
  Shield,
  Code,
  Users,
} from "lucide-react"
import { SupportTicketForm } from "@/components/support/support-ticket-form"

export const metadata: Metadata = {
  title: "Support Center | Mycosoft",
  description: "Get help with Mycosoft products, browse FAQs, submit support tickets, and access documentation.",
}

const faqCategories = [
  {
    category: "Getting Started",
    icon: Zap,
    questions: [
      {
        q: "How do I get started with Mycosoft?",
        a: "To get started, create an account on our platform, explore the dashboard, and connect your first device or data source. Check our Getting Started guide in the documentation for detailed instructions.",
      },
      {
        q: "What are the system requirements?",
        a: "Mycosoft is a cloud-based platform accessible via modern web browsers (Chrome, Firefox, Safari, Edge). For device integrations, you'll need network connectivity and our MycoBrain hardware or compatible sensors.",
      },
      {
        q: "Is there a free tier available?",
        a: "Yes! We offer a free tier that includes basic monitoring, limited data storage, and access to community support. Upgrade to paid plans for advanced features, increased storage, and priority support.",
      },
    ],
  },
  {
    category: "Account & Billing",
    icon: Users,
    questions: [
      {
        q: "How do I manage my subscription?",
        a: "Navigate to Account Settings → Billing to view your current plan, update payment methods, change subscription tiers, or cancel your subscription. Downgrades take effect at the end of your billing cycle.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, Mastercard, American Express), ACH bank transfers for enterprise customers, and cryptocurrency payments for annual plans.",
      },
      {
        q: "Can I get a refund?",
        a: "We offer a 30-day money-back guarantee for annual plans. Monthly subscriptions are non-refundable but can be cancelled at any time. Contact support@mycosoft.com for refund requests.",
      },
    ],
  },
  {
    category: "Technical Support",
    icon: Code,
    questions: [
      {
        q: "How do I connect my MycoBrain device?",
        a: "Connect your MycoBrain device to your network via WiFi or Ethernet, then navigate to Devices → Add Device in your dashboard. Follow the pairing wizard to complete setup. Devices should appear in your network within 2-3 minutes.",
      },
      {
        q: "Why is my device showing offline?",
        a: "Check that your device has power and network connectivity. Verify firewall rules allow connections to our servers. If the issue persists, try restarting the device and check our status page for any service disruptions.",
      },
      {
        q: "How do I troubleshoot API connection issues?",
        a: "Verify your API key is valid and has appropriate permissions. Check that you're using the correct endpoint URL. Review rate limits and ensure you're not exceeding them. Enable debug logging for detailed error information.",
      },
    ],
  },
  {
    category: "Data & MINDEX",
    icon: Database,
    questions: [
      {
        q: "How is my data stored and secured?",
        a: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We use PostgreSQL with pgvector for structured data and Qdrant for vector embeddings. Data is replicated across multiple availability zones for redundancy.",
      },
      {
        q: "Can I export my data?",
        a: "Yes! You can export your data in JSON, CSV, or Parquet formats. Navigate to Settings → Data Export to download your datasets. API access is also available for programmatic exports.",
      },
      {
        q: "What is MINDEX and how does it work?",
        a: "MINDEX (Mycelial Intelligence and Data Exchange) is our knowledge graph and vector database that powers intelligent search, recommendations, and data discovery. It indexes your data and creates semantic relationships automatically.",
      },
    ],
  },
  {
    category: "Security & Privacy",
    icon: Shield,
    questions: [
      {
        q: "Is Mycosoft GDPR and CCPA compliant?",
        a: "Yes, we are fully compliant with GDPR, CCPA, and other data protection regulations. You can request data deletion, access your data, or export it at any time through your account settings.",
      },
      {
        q: "How do you handle security vulnerabilities?",
        a: "We have a responsible disclosure program. Report security issues to security@mycosoft.com. We typically respond within 24 hours and aim to patch critical vulnerabilities within 72 hours.",
      },
      {
        q: "Can I use my own encryption keys?",
        a: "Enterprise customers can bring their own keys (BYOK) for encryption. Contact our enterprise team to set up customer-managed encryption keys through our key management service.",
      },
    ],
  },
  {
    category: "API & Integrations",
    icon: Code,
    questions: [
      {
        q: "Where can I find API documentation?",
        a: "Our comprehensive API documentation is available at docs.mycosoft.com/api. It includes endpoints, authentication guides, code examples in multiple languages, and interactive API explorers.",
      },
      {
        q: "What integrations are available?",
        a: "We integrate with n8n for workflow automation, Supabase for authentication, Cloudflare for CDN, and support webhooks for custom integrations. See our integrations marketplace for the full list.",
      },
      {
        q: "What are the API rate limits?",
        a: "Free tier: 1,000 requests/day. Pro: 10,000 requests/day. Enterprise: Custom limits. Rate limits are per API key. Burst allowances are available. Check response headers for current usage.",
      },
    ],
  },
]

const supportResources = [
  {
    icon: FileText,
    title: "Documentation",
    description: "Comprehensive guides and API references",
    href: "/docs",
    color: "amber",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    description: "Tutorials, best practices, and how-to articles",
    href: "/docs/guides",
    color: "purple",
  },
  {
    icon: MessageSquare,
    title: "Community Forum",
    description: "Connect with other users and share knowledge",
    href: "https://community.mycosoft.com",
    color: "green",
  },
  {
    icon: Mail,
    title: "Contact Us",
    description: "Reach out directly to our team",
    href: "/contact",
    color: "blue",
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 to-background z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:60px_60px] z-10" />
        
        <div className="container max-w-5xl mx-auto px-6 relative z-20 text-center">
          <Badge className="mb-6 bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Headphones className="h-3 w-3 mr-2" />
            Support Center
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            How Can We{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Help You?
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Browse our FAQs, submit a support ticket, or explore our documentation 
            to get the assistance you need.
          </p>
        </div>
      </section>

      {/* Quick Support Resources */}
      <section className="py-12">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {supportResources.map((resource) => (
              <Link key={resource.title} href={resource.href}>
                <Card className="h-full hover:border-blue-500/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className={`p-2 rounded-lg bg-${resource.color}-500/10 w-fit mb-2`}>
                      <resource.icon className={`h-5 w-5 text-${resource.color}-500`} />
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about Mycosoft products, services, and support.
            </p>
          </div>

          <div className="space-y-8">
            {faqCategories.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <category.icon className="h-5 w-5 text-blue-500" />
                    </div>
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, index) => (
                      <AccordionItem key={index} value={`${category.category}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support Ticket Form Section */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Need More Help?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Can't find what you're looking for? Submit a support ticket and our team will 
              get back to you within 24 hours.
            </p>
          </div>

          <SupportTicketForm />
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">Additional Resources</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-500" />
                  System Status
                </CardTitle>
                <CardDescription>
                  Check current service availability and uptime
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/status" className="text-blue-500 hover:underline text-sm">
                  View Status Page →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-purple-500" />
                  Developer Resources
                </CardTitle>
                <CardDescription>
                  API docs, SDKs, and integration guides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/docs/api" className="text-blue-500 hover:underline text-sm">
                  Explore API Docs →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-500" />
                  Video Tutorials
                </CardTitle>
                <CardDescription>
                  Watch step-by-step guides and walkthroughs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/tutorials" className="text-blue-500 hover:underline text-sm">
                  Watch Tutorials →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
