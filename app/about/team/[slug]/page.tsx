"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Linkedin, Twitter, Github, Mail, Globe, Award, Briefcase, GraduationCap, MapPin } from "lucide-react"
import { teamMembers } from "@/lib/team-data"

export default function TeamMemberPage() {
  const params = useParams()
  const slug = params.slug as string
  const member = teamMembers.find((m) => m.slug === slug)

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Team Member Not Found</h1>
            <p className="text-muted-foreground mb-6">The team member you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/about">Back to About</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-24 border-b">
        <div className="container max-w-6xl mx-auto px-6">
          <Button variant="ghost" className="mb-8" asChild>
            <Link href="/about">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to About
            </Link>
          </Button>

          <div className="grid md:grid-cols-[300px,1fr] gap-12">
            {/* Profile Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-green-500/20">
              <Image
                src={member.image}
                alt={member.name}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Profile Info */}
            <div className="flex flex-col justify-center">
              <Badge className="mb-4 w-fit bg-green-500/20 text-green-400 border-green-500/30">
                {member.role}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{member.name}</h1>
              <p className="text-xl text-muted-foreground mb-6">{member.bio}</p>

              {/* Social Links */}
              <div className="flex gap-3">
                {member.linkedin && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.twitter && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={member.twitter} target="_blank" rel="noopener noreferrer">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.github && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={member.github} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.email && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={`mailto:${member.email}`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.website && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={member.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-24">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Experience */}
            {member.experience && member.experience.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-green-500" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {member.experience.map((exp, idx) => (
                      <div key={idx}>
                        <div className="font-semibold">{exp.title}</div>
                        <div className="text-sm text-muted-foreground">{exp.company}</div>
                        <div className="text-xs text-muted-foreground">{exp.period}</div>
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
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-green-500" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {member.education.map((edu, idx) => (
                      <div key={idx}>
                        <div className="font-semibold">{edu.degree}</div>
                        <div className="text-sm text-muted-foreground">{edu.institution}</div>
                        {edu.year && (
                          <div className="text-xs text-muted-foreground">{edu.year}</div>
                        )}
                        {idx < member.education!.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bio/Description */}
          {member.description && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  {member.description.split('\n').map((para, idx) => (
                    <p key={idx} className="text-muted-foreground mb-4">
                      {para}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Achievements */}
          {member.achievements && member.achievements.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-500" />
                  Achievements & Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {member.achievements.map((achievement, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span className="text-muted-foreground">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Location */}
          {member.location && (
            <Card className="mt-8">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{member.location}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}



































