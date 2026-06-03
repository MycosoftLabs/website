import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Compliance | Mycosoft",
  description:
    "Mycosoft federal compliance — NDAA, NIST SP 800-171 / CMMC, Buy American & Buy America, and supply-chain security for U.S. government and defense deployments.",
}

export default function CompliancePage() {
  return (
    <div className="container py-6 md:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-4xl font-bold mb-4">Compliance</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Mycosoft builds Earth Intelligence hardware, software, and AI for government, defense, and critical-infrastructure
          customers. This page summarizes the standards, certifications, and supply-chain controls our products and
          programs are aligned to.
        </p>

        <div className="prose dark:prose-invert max-w-none">
          {/* Federal entity / registration */}
          <h2 className="text-2xl font-bold mt-12 mb-4">Federal Contracting Entity</h2>
          <p>
            Mycosoft, LLC — a California operating subsidiary of Mycosoft, Inc. (a Delaware C-Corporation) — is the
            federal contracting entity and an active, SAM.gov-registered supplier eligible for U.S. federal contracting.
          </p>
          <ul>
            <li>
              <strong>UEI:</strong> YK3ARVKJ77S9
            </li>
            <li>
              <strong>CAGE Code:</strong> 9KR60
            </li>
            <li>
              <strong>Registration:</strong> Active in SAM.gov (System for Award Management)
            </li>
          </ul>

          {/* NDAA / Blue UAS */}
          <h2 className="text-2xl font-bold mt-12 mb-4">NDAA &amp; Unmanned Aircraft (UAS) Compliance</h2>
          <p>
            Mycosoft hardware and edge devices are engineered to meet the requirements of the National Defense
            Authorization Act (NDAA), including the procurement restrictions of Sections 848, 889, and the
            unmanned-aircraft-system (UAS) provisions that restrict U.S. government procurement and operation of covered
            equipment originating from certain foreign countries.
          </p>
          <ul>
            <li>
              <strong>NDAA-aligned bill of materials:</strong> Covered components are sourced to avoid prohibited foreign
              suppliers as defined under the NDAA.
            </li>
            <li>
              <strong>Blue UAS / Blue List readiness:</strong> Our drone- and UAS-deployable sensing payloads (including
              MycoBrain edge devices) are designed for compatibility with the DoD Defense Innovation Unit (DIU) Blue UAS
              Framework so they can be integrated into approved unmanned platforms for secure government operations.
            </li>
            <li>
              <strong>Secure government operations:</strong> Device identity, operator identity, audit logging, and data
              lineage controls support deployment in secure and classified-adjacent environments.
            </li>
          </ul>

          {/* CMMC / NIST */}
          <h2 className="text-2xl font-bold mt-12 mb-4">CMMC &amp; NIST SP 800-171</h2>
          <p>
            Mycosoft aligns its information-security program to the Department of Defense Cybersecurity Maturity Model
            Certification (CMMC) framework and the underlying NIST controls that protect Controlled Unclassified
            Information (CUI) and Federal Contract Information (FCI).
          </p>
          <ul>
            <li>
              <strong>NIST SP 800-171:</strong> Safeguarding CUI in nonfederal systems — implementation of the 110
              security requirements across all 14 control families.
            </li>
            <li>
              <strong>CMMC 2.0:</strong> Maturity alignment to support Level 1 (FCI) and Level 2 (CUI) requirements for
              participation in the Defense Industrial Base (DIB).
            </li>
            <li>
              <strong>NIST SP 800-53 / 800-161:</strong> Security and privacy controls and supply-chain risk management
              (C-SCRM) practices applied across our systems and vendors.
            </li>
            <li>
              <strong>NIST Cybersecurity Framework (CSF):</strong> Govern, Identify, Protect, Detect, Respond, and
              Recover functions guiding our security operations.
            </li>
          </ul>

          {/* Buy American / Buy America */}
          <h2 className="text-2xl font-bold mt-12 mb-4">Buy American &amp; Buy America</h2>
          <p>
            Mycosoft supports U.S. domestic-preference procurement requirements for federal, state, and local customers.
          </p>
          <ul>
            <li>
              <strong>Buy American Act (BAA):</strong> Applies to direct purchases by the U.S. federal government; we
              support domestic-content and country-of-origin requirements for covered acquisitions.
            </li>
            <li>
              <strong>Buy America Act:</strong> Applies to manufactured products in federally funded mass-transit and
              infrastructure projects administered by agencies such as the Federal Transit Administration (FTA).
            </li>
            <li>
              <strong>Domestic manufacturing &amp; assembly:</strong> U.S.-based assembly and integration of covered
              devices, with a domestic-sourcing roadmap for critical components.
            </li>
            <li>
              <strong>TAA:</strong> Trade Agreements Act (TAA) compliance available for designated-country sourcing where
              applicable.
            </li>
          </ul>

          {/* Supply chain & data */}
          <h2 className="text-2xl font-bold mt-12 mb-4">Supply-Chain &amp; Data Security</h2>
          <ul>
            <li>
              <strong>Supply-chain vetting:</strong> Component- and vendor-level review to mitigate foreign-component and
              counterfeit-part risk.
            </li>
            <li>
              <strong>Data sovereignty:</strong> U.S.-region data hosting options with retention, chain-of-custody, and
              access controls for government workloads.
            </li>
            <li>
              <strong>Encryption:</strong> Data-in-transit and data-at-rest encryption (including AES-256) across covered
              systems and integrations.
            </li>
          </ul>

          {/* Contact */}
          <h2 className="text-2xl font-bold mt-12 mb-4">Compliance Contact</h2>
          <p>
            For compliance documentation, supplier questionnaires, SSP/POA&amp;M requests, or to discuss a government or
            defense deployment, contact{" "}
            <a href="mailto:compliance@mycosoft.com" className="underline">
              compliance@mycosoft.com
            </a>{" "}
            or <a href="/contact" className="underline">reach out to our team</a>.
          </p>
          <p className="text-sm text-muted-foreground mt-8">
            This page is provided for informational purposes and describes the standards and frameworks Mycosoft products
            and programs are aligned to. Specific certification status by product line is available under NDA upon
            request. Last updated: June 2026.
          </p>
        </div>
      </div>
    </div>
  )
}
