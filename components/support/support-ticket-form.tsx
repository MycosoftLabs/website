"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

interface FormData {
  name: string
  email: string
  issueType: string
  description: string
}

interface FormErrors {
  name?: string
  email?: string
  issueType?: string
  description?: string
}

export function SupportTicketForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    issueType: "",
    description: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [submitMessage, setSubmitMessage] = useState("")

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.issueType) {
      newErrors.issueType = "Please select an issue type"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    } else if (formData.description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters"
    } else if (formData.description.trim().length > 2000) {
      newErrors.description = "Description must be less than 2000 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    if (errors[id as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }))
    }
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, issueType: value }))
    if (errors.issueType) {
      setErrors((prev) => ({ ...prev, issueType: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitStatus("idle")
    setSubmitMessage("")

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit ticket")
      }

      setSubmitStatus("success")
      setSubmitMessage(data.message || "Your support ticket has been submitted successfully!")
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        issueType: "",
        description: "",
      })
    } catch (error) {
      setSubmitStatus("error")
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "An error occurred. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Submit a Support Ticket</CardTitle>
        <CardDescription>
          Describe your issue and our support team will get back to you within 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitStatus === "success" ? (
          <div className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Ticket Submitted!</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {submitMessage}
              </p>
            </div>
            <Button
              onClick={() => setSubmitStatus("idle")}
              variant="outline"
              className="mt-4"
            >
              Submit Another Ticket
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitStatus === "error" && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-500">{submitMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? "border-red-500" : ""}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? "border-red-500" : ""}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="issueType">
                Issue Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.issueType}
                onValueChange={handleSelectChange}
                disabled={isSubmitting}
              >
                <SelectTrigger className={`w-full ${errors.issueType ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="account">Account & Billing</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="security">Security Concern</SelectItem>
                  <SelectItem value="integration">Integration Help</SelectItem>
                  <SelectItem value="api">API Support</SelectItem>
                  <SelectItem value="data">Data & MINDEX</SelectItem>
                  <SelectItem value="device">Device Support</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.issueType && (
                <p className="text-sm text-red-500">{errors.issueType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Please describe your issue in detail..."
                rows={6}
                value={formData.description}
                onChange={handleInputChange}
                className={errors.description ? "border-red-500" : ""}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.description.length} / 2000 characters
              </p>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Ticket
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By submitting this ticket, you agree to our{" "}
              <Link href="/privacy" className="text-blue-500 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
