import Image from "next/image"
import Link from "next/link"
import { NeuCard, NeuCardContent, NeuBadge } from "@/components/ui/neuromorphic"
import { teamMembers } from "@/lib/team-data"

/** Human team display order: top row Morgan–Michelle, bottom row RJ–Chris–Alberto–Garret */
const TOP_ROW_SLUGS = ["morgan-rockwell", "michelle-seven"]
const BOTTOM_ROW_SLUGS = ["rj-ricasata", "chris-freetage", "alberto-septien", "garret-baquet"]

function getMembersBySlugs(slugs: string[]) {
  return slugs
    .map((slug) => teamMembers.find((m) => m.slug === slug))
    .filter((m): m is NonNullable<typeof m> => m != null)
}

function MemberCard({
  member,
}: {
  member: (typeof teamMembers)[number]
}) {
  return (
    <Link href={`/about/team/${member.slug}`}>
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
  )
}

export function HumanTeamProfiles() {
  const topRow = getMembersBySlugs(TOP_ROW_SLUGS)
  const bottomRow = getMembersBySlugs(BOTTOM_ROW_SLUGS)

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

      <div className="space-y-6">
        {/* Top row: Morgan – Michelle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {topRow.map((member) => (
            <MemberCard key={member.slug} member={member} />
          ))}
        </div>
        {/* Bottom row: RJ – Chris – Alberto – Garret */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bottomRow.map((member) => (
            <MemberCard key={member.slug} member={member} />
          ))}
        </div>
      </div>
    </section>
  )
}
