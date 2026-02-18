"use client"

import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Award,
  Briefcase,
  ExternalLink,
  Github,
  GraduationCap,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Mic,
  Newspaper,
  Radio,
  Twitter,
  Video,
} from "lucide-react"
import { teamMembers } from "@/lib/team-data"
import type { TeamInterview } from "@/lib/team-data"

// X (Twitter) icon since lucide doesn't have an X icon
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// Medium icon
function MediumIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  )
}

const interviewTypeConfig: Record<
  TeamInterview["type"],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  interview: { label: "Interview", icon: Mic, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  article:   { label: "Article",   icon: Newspaper, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  podcast:   { label: "Podcast",   icon: Radio, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  talk:      { label: "Talk",      icon: Video, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function TeamMemberPage() {
  const params = useParams()
  const slug = params.slug as string
  const member = teamMembers.find((m) => m.slug === slug)

  if (!member) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Team Member Not Found</h1>
            <p className="text-muted-foreground mb-6">The team member you&apos;re looking for doesn&apos;t exist.</p>
            <Button asChild>
              <Link href="/about">Back to About</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Social links array — only include those present
  const socialLinks = [
    member.linkedin && {
      href: member.linkedin,
      label: "LinkedIn",
      icon: Linkedin,
      color: "hover:border-blue-500/50 hover:text-blue-400",
    },
    member.xUrl && {
      href: member.xUrl,
      label: "X",
      icon: XIcon,
      color: "hover:border-foreground/50 hover:text-foreground",
    },
    member.github && {
      href: member.github,
      label: "GitHub",
      icon: Github,
      color: "hover:border-foreground/50 hover:text-foreground",
    },
    member.medium && {
      href: member.medium,
      label: "Medium",
      icon: MediumIcon,
      color: "hover:border-green-500/50 hover:text-green-400",
    },
    member.portfolio && {
      href: member.portfolio,
      label: "Portfolio",
      icon: Globe,
      color: "hover:border-green-500/50 hover:text-green-400",
    },
    member.website && !member.portfolio && {
      href: member.website,
      label: "Website",
      icon: Globe,
      color: "hover:border-green-500/50 hover:text-green-400",
    },
    member.email && {
      href: `mailto:${member.email}`,
      label: "Email",
      icon: Mail,
      color: "hover:border-green-500/50 hover:text-green-400",
    },
  ].filter(Boolean) as Array<{
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }>

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Hero ── */}
      <section className="relative py-12 md:py-20 border-b bg-muted/20">
        <div className="container max-w-6xl mx-auto px-4 md:px-6">
          <Button variant="ghost" size="sm" className="mb-8 gap-2 min-h-[44px]" asChild>
            <Link href="/about">
              <ArrowLeft className="h-4 w-4" />
              Back to About
            </Link>
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-8 md:gap-12 items-start">
            {/* Photo */}
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-green-500/20 w-full max-w-[280px] mx-auto md:mx-0">
              <Image
                src={member.image}
                alt={member.name}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Info */}
            <div>
              <Badge className="mb-3 bg-green-500/20 text-green-400 border-green-500/30">
                {member.role}
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">{member.name}</h1>
              {member.location && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-3.5 w-3.5" />
                  {member.location}
                </div>
              )}
              <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed max-w-2xl">
                {member.bio}
              </p>

              {/* Social icons row */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map(({ href, label, icon: Icon, color }) => (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith("mailto") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      aria-label={label}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-2 min-h-[44px] transition-colors ${color}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{label}</span>
                      </Button>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="py-12 md:py-20">
        <div className="container max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left column: Bio + Achievements */}
            <div className="lg:col-span-2 space-y-6">

              {/* Full bio */}
              {member.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{member.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Achievements */}
              {member.achievements && member.achievements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5 text-green-500" />
                      Achievements & Contributions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5">
                      {member.achievements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                          <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {member.experience && member.experience.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Briefcase className="h-5 w-5 text-green-500" />
                      Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {member.experience.map((exp, idx) => (
                        <div key={idx}>
                          <p className="font-semibold text-sm">{exp.title}</p>
                          <p className="text-sm text-muted-foreground">{exp.company}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{exp.period}</p>
                          {idx < member.experience!.length - 1 && <Separator className="mt-4" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {member.education && member.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <GraduationCap className="h-5 w-5 text-green-500" />
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {member.education.map((edu, idx) => (
                        <div key={idx}>
                          <p className="font-semibold text-sm">{edu.degree}</p>
                          <p className="text-sm text-muted-foreground">{edu.institution}</p>
                          {edu.year && <p className="text-xs text-muted-foreground mt-0.5">{edu.year}</p>}
                          {idx < member.education!.length - 1 && <Separator className="mt-4" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column: Social cards + Press & Media */}
            <div className="space-y-6">

              {/* Connect card */}
              {socialLinks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Connect</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {socialLinks.map(({ href, label, icon: Icon, color }) => (
                      <a
                        key={label}
                        href={href}
                        target={href.startsWith("mailto") ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </a>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Press & Media */}
              {member.interviews && member.interviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Press & Media</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {member.interviews.map((item, idx) => {
                      const config = interviewTypeConfig[item.type]
                      const Icon = config.icon
                      return (
                        <a
                          key={idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <div className="p-3 rounded-lg border border-border hover:border-green-500/40 hover:bg-muted/40 transition-all">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <Badge className={`text-xs shrink-0 ${config.color}`}>
                                <Icon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-green-500 transition-colors shrink-0 mt-0.5" />
                            </div>
                            <p className="text-sm font-medium leading-snug group-hover:text-green-500 transition-colors mb-1">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{item.publication}</span>
                              <span>·</span>
                              <span>{formatDate(item.date)}</span>
                            </div>
                          </div>
                        </a>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
