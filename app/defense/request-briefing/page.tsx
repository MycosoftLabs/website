"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Lock,
  Building2,
  User,
  Mail,
  Phone,
  MessageSquare,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().optional(),
  organization: z.string().min(2, "Organization is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  classificationLevel: z.string().optional(),
  areasOfInterest: z.array(z.string()).optional(),
  message: z.string().min(10, "Please provide more details about your inquiry"),
})

type FormData = z.infer<typeof formSchema>

const areasOfInterest = [
  { id: "oei", label: "Operational Environmental Intelligence" },
  { id: "hardware", label: "Hardware & Devices" },
  { id: "software", label: "Software & NatureOS" },
  { id: "integration", label: "System Integration" },
  { id: "pilot", label: "Pilot Program" },
  { id: "training", label: "Training & Support" },
]

const classificationLevels = [
  { value: "unclassified", label: "UNCLASSIFIED" },
  { value: "cui", label: "CUI" },
  { value: "secret", label: "SECRET" },
  { value: "topsecret", label: "TOP SECRET" },
]

export default function RequestBriefingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      title: "",
      organization: "",
      email: "",
      phone: "",
      classificationLevel: "",
      areasOfInterest: [],
      message: "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/defense/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, areasOfInterest: selectedAreas }),
      })

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        throw new Error("Submission failed")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleArea = (areaId: string) => {
    setSelectedAreas(prev => 
      prev.includes(areaId) 
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="border-green-500/20">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Request Submitted</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for your interest in Mycosoft&apos;s Operational Environmental Intelligence platform. 
                Our defense team will review your request and contact you within 2 business days.
              </p>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg text-left">
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>A member of our cleared personnel team will reach out</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>We&apos;ll schedule a briefing at your convenience</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Technical documentation will be provided as appropriate</span>
                    </li>
                  </ul>
                </div>
                <Button asChild>
                  <Link href="/defense">
                    Return to Defense Portal
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <Link 
            href="/defense" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Defense Portal
          </Link>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 border-yellow-500/50 text-yellow-500">
            UNCLASS // FOR OFFICIAL USE ONLY
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Request a Briefing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with our defense team to learn how Operational Environmental Intelligence 
            can enhance your mission capabilities.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Briefing Request Form
              </CardTitle>
              <CardDescription>
                All information is transmitted securely. Our team includes cleared personnel 
                ready to discuss classified requirements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input 
                        id="name" 
                        placeholder="John Smith"
                        {...form.register("name")}
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title / Rank</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g., LCDR, GS-15, Director"
                        {...form.register("title")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="organization" 
                        className="pl-10"
                        placeholder="e.g., NAVFAC, USACE, DHS S&T"
                        {...form.register("organization")}
                      />
                    </div>
                    {form.formState.errors.organization && (
                      <p className="text-sm text-destructive">{form.formState.errors.organization.message}</p>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          type="email"
                          className="pl-10"
                          placeholder="john.smith@agency.gov"
                          {...form.register("email")}
                        />
                      </div>
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          type="tel"
                          className="pl-10"
                          placeholder="(555) 123-4567"
                          {...form.register("phone")}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Classification Level */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Briefing Requirements
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="classification">Desired Classification Level</Label>
                    <Select onValueChange={(value) => form.setValue("classificationLevel", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select classification level" />
                      </SelectTrigger>
                      <SelectContent>
                        {classificationLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Areas of Interest */}
                <div className="space-y-4">
                  <Label>Areas of Interest</Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {areasOfInterest.map((area) => (
                      <div 
                        key={area.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAreas.includes(area.id) 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-muted-foreground"
                        }`}
                        onClick={() => toggleArea(area.id)}
                      >
                        <Checkbox 
                          checked={selectedAreas.includes(area.id)}
                          onCheckedChange={() => toggleArea(area.id)}
                        />
                        <span className="text-sm">{area.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">
                    <MessageSquare className="inline h-4 w-4 mr-2" />
                    Tell us about your requirements *
                  </Label>
                  <Textarea 
                    id="message"
                    rows={5}
                    placeholder="Please describe your operational environment, current challenges, and what you hope to learn from our briefing..."
                    {...form.register("message")}
                  />
                  {form.formState.errors.message && (
                    <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>
                  )}
                </div>

                {/* Security Notice */}
                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      This form is transmitted over TLS encryption. Do not include classified 
                      information in this submission. For classified inquiries, please indicate 
                      your requirements and our team will arrange appropriate communications.
                    </span>
                  </p>
                </div>

                {/* Submit */}
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Request
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
