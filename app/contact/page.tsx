import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  MessageSquare,
  Building2,
  Globe,
  Github,
  Twitter,
  Linkedin,
  ArrowRight,
  Send,
  Headphones,
  FileText,
  Users,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Contact Us | Mycosoft",
  description: "Get in touch with the Mycosoft team. We're here to help with questions about our products, research, partnerships, and more.",
}

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    description: "For general inquiries",
    value: "hello@mycosoft.com",
    link: "mailto:hello@mycosoft.com",
  },
  {
    icon: Headphones,
    title: "Support",
    description: "Technical assistance",
    value: "support@mycosoft.com",
    link: "mailto:support@mycosoft.com",
  },
  {
    icon: Users,
    title: "Partnerships",
    description: "Business development",
    value: "partners@mycosoft.com",
    link: "mailto:partners@mycosoft.com",
  },
  {
    icon: FileText,
    title: "Press",
    description: "Media inquiries",
    value: "press@mycosoft.com",
    link: "mailto:press@mycosoft.com",
  },
]

const offices = [
  {
    city: "San Francisco",
    country: "United States",
    role: "Headquarters",
    address: "548 Market St, Suite 35000",
    timezone: "PST (UTC-8)",
  },
]

const socialLinks = [
  { icon: Github, label: "GitHub", href: "https://github.com/mycosoft" },
  { icon: Twitter, label: "Twitter", href: "https://twitter.com/mycosoft" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/company/mycosoft" },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-950/30 to-background z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.02)_1px,transparent_1px)] bg-[size:60px_60px] z-10" />
        
        <div className="container max-w-5xl mx-auto px-6 relative z-20 text-center">
          <Badge className="mb-6 bg-green-500/20 text-green-400 border-green-500/30">
            Get in Touch
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            We'd Love to{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Hear From You
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you have questions about our products, want to explore partnership opportunities, 
            or just want to say hello — our team is here to help.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactMethods.map((method) => (
              <a 
                key={method.title} 
                href={method.link}
                className="block"
              >
                <Card className="h-full hover:border-green-500/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="p-2 rounded-lg bg-green-500/10 w-fit mb-2">
                      <method.icon className="h-5 w-5 text-green-500" />
                    </div>
                    <CardTitle className="text-lg">{method.title}</CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm text-green-500 hover:text-green-400">
                      {method.value}
                    </span>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Main Contact Form Section */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Send us a Message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you within 24-48 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@example.com" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company">Company (Optional)</Label>
                      <Input id="company" placeholder="Your company name" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="How can we help?" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Tell us more about your inquiry..." 
                        rows={5}
                        required 
                      />
                    </div>
                    
                    <Button type="submit" className="w-full gap-2 bg-green-600 hover:bg-green-700">
                      <Send className="h-4 w-4" />
                      Send Message
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      By submitting this form, you agree to our{" "}
                      <Link href="/privacy" className="text-green-500 hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Office Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-500" />
                    Our Office
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {offices.map((office) => (
                    <div key={office.city}>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{office.city}, {office.country}</span>
                      </div>
                      <Badge variant="secondary" className="mb-2">{office.role}</Badge>
                      <p className="text-sm text-muted-foreground">{office.address}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{office.timezone}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Business Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-500" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monday - Friday</span>
                    <span>9:00 AM - 6:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saturday - Sunday</span>
                    <span>Closed</span>
                  </div>
                  <p className="text-muted-foreground pt-2">
                    Support tickets are monitored 24/7 for critical issues.
                  </p>
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-500" />
                    Connect With Us
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {socialLinks.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        aria-label={social.label}
                      >
                        <social.icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">Looking for Something Else?</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Link href="/support">
              <Card className="h-full hover:border-green-500/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="p-2 rounded-lg bg-blue-500/10 w-fit mb-2">
                    <Headphones className="h-5 w-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-lg">Support Center</CardTitle>
                  <CardDescription>
                    Browse FAQs and troubleshooting guides
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/careers">
              <Card className="h-full hover:border-green-500/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="p-2 rounded-lg bg-purple-500/10 w-fit mb-2">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <CardTitle className="text-lg">Careers</CardTitle>
                  <CardDescription>
                    Join our team and build the future
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/docs">
              <Card className="h-full hover:border-green-500/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="p-2 rounded-lg bg-amber-500/10 w-fit mb-2">
                    <FileText className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-lg">Documentation</CardTitle>
                  <CardDescription>
                    Technical docs and API references
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
