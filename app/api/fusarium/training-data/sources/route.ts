import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import {
  TRAINING_SOURCE_CANDIDATES,
  TRAINING_SOURCE_REGISTRY_V1,
  trainingSourceAcquisitionBlockers,
  validateTrainingSourceRegistryV1,
} from "@/lib/fusarium/training-data/source-registry"
import {
  MULTIMODAL_NON_CANDIDATE_DIRECTIONS,
  MULTIMODAL_SOURCE_CANDIDATES,
  MULTIMODAL_SOURCE_REGISTRY_V1,
  validateMultimodalSourceRegistryV1,
} from "@/lib/fusarium/training-data/multimodal-source-registry"

export const dynamic = "force-dynamic"

/**
 * Owner-only, read-only acquisition catalog. Candidate entries originated in
 * user-supplied planning documents. They remain inert until every acquisition
 * boundary is independently verified and approved.
 */
export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const issues = [
    ...validateTrainingSourceRegistryV1(),
    ...validateMultimodalSourceRegistryV1().map((issue) => `multimodal: ${issue}`),
  ]
  if (issues.length > 0) {
    return NextResponse.json(
      {
        schema: TRAINING_SOURCE_REGISTRY_V1.schema,
        state: "invalid",
        message: "The training-source registry failed its local contract validation.",
        issues,
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  }

  const candidates = TRAINING_SOURCE_CANDIDATES.map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    origin: candidate.origin,
    sourceOrdinal: candidate.sourceOrdinal,
    sourceTypeClaim: candidate.sourceTypeClaim,
    sourceCategory: candidate.sourceCategory,
    modalities: candidate.modalities,
    catalogTargets: candidate.catalogTargets,
    acquisitionState: candidate.acquisitionState,
    executionAuthority: candidate.executionAuthority,
    blockers: trainingSourceAcquisitionBlockers(candidate),
  }))
  const sineCandidates = candidates.filter((candidate) =>
    candidate.catalogTargets.some((target) => target.startsWith("sine-")),
  )
  const multimodalCandidates = MULTIMODAL_SOURCE_CANDIDATES.map((candidate) => ({
    id: candidate.id,
    application: candidate.application,
    modalities: candidate.modalities,
    artifactKinds: candidate.artifactKinds,
    trainingSourceRole: candidate.trainingSourceRole,
    sourceSummary: candidate.sourceSummary,
    authorityReferences: candidate.authorityReferences.map((reference) => ({
      title: reference.title,
      kind: reference.kind,
      observationState: reference.observationState,
      locatorAvailable: Boolean(reference.url || reference.doi),
    })),
    terms: candidate.terms,
    version: candidate.version,
    checksum: {
      state: candidate.checksum.state,
      providerChecksumCount: candidate.checksum.providerChecksums.length,
      mycosoftSha256: candidate.checksum.mycosoftSha256,
    },
    size: candidate.size,
    destination: candidate.destination,
    provenance: candidate.provenance,
    validation: candidate.validation,
    approval: candidate.approval,
    statuses: candidate.statuses,
    gate: candidate.gate,
    executionAuthority: candidate.executionAuthority,
  }))

  return NextResponse.json(
    {
      state: "available",
      schema: TRAINING_SOURCE_REGISTRY_V1.schema,
      version: TRAINING_SOURCE_REGISTRY_V1.version,
      reviewedDate: TRAINING_SOURCE_REGISTRY_V1.reviewedDate,
      terminology: TRAINING_SOURCE_REGISTRY_V1.terminology,
      executionPolicy: TRAINING_SOURCE_REGISTRY_V1.executionPolicy,
      counts: {
        total: candidates.length,
        sine: sineCandidates.length,
        approved: 0,
        acquired: 0,
      },
      candidates,
      multimodal: {
        schema: MULTIMODAL_SOURCE_REGISTRY_V1.schema,
        version: MULTIMODAL_SOURCE_REGISTRY_V1.version,
        counts: {
          total: multimodalCandidates.length,
          approved: 0,
          acquired: 0,
        },
        candidates: multimodalCandidates,
        nonCandidateDirections: MULTIMODAL_NON_CANDIDATE_DIRECTIONS,
        executionPolicy: MULTIMODAL_SOURCE_REGISTRY_V1.executionPolicy,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
  )
}
