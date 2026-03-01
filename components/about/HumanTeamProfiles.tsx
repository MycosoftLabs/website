import Image from "next/image"
import Link from "next/link"
import { NeuCard, NeuCardContent, NeuBadge } from "@/components/ui/neuromorphic"
import { teamMembers } from "@/lib/team-data"

export function HumanTeamProfiles() {
  return (
    <section className="py-10 md:py-14">
      <div className="text-center mb-8">
        <NeuBadge variant="default" className="mb-3 border border-white/20">
          Human Leadership
        </NeuBadge>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          Profiles & Human History
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mt-2">
          Human leadership provides context, philosophy, and accountability alongside autonomous digital teams.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member) => (
          <Link key={member.slug} href={`/about/team/${member.slug}`}>
            <NeuCard className="group transition-all cursor-pointer overflow-hidden h-full">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <Image
                  src={member.image.startsWith("/") ? encodeURI(member.image) : member.image}
                  alt={member.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <NeuCardContent className="p-4">
                <NeuBadge variant="success" className="mb-2 text-xs">
                  {member.role}
                </NeuBadge>
                <h3 className="text-lg font-bold">{member.name}</h3>
              </NeuCardContent>
            </NeuCard>
          </Link>
        ))}
      </div>
    </section>
  )
}
