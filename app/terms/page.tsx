import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service - Mycosoft",
  description: "Terms and conditions for using Mycosoft's services and products",
}

export default function TermsPage() {
  return (
    <div className="container py-6 md:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-xl text-muted-foreground mb-8">
            Welcome to Mycosoft's website, software, hardware, facilities, and services. By accessing and using any of
            our products, platforms, devices, data, or programs, you agree to comply with and be bound by the following
            terms and conditions:
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing, using, or interacting with Mycosoft's website, devices, software, data, facilities, or any
            related services, you acknowledge that you have read, understood, and agree to these terms of service. If
            you do not agree to these terms, please refrain from using our products or services.
          </p>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold mt-12 mb-4">2. Scope of Use</h2>
          <p>
            You agree to use Mycosoft's website, software, hardware, and facilities for lawful purposes only. This
            includes but is not limited to our cloud services, NatureOS operating system, HPL programming language,
            Mycelium Simulator, Mushroom1 device, SporeBase, and any other tools or data repositories. You must not use
            Mycosoft's resources in any way that violates local, national, or international laws or regulations or that
            compromises the integrity, security, or functionality of our systems, devices, or data.
          </p>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold mt-12 mb-4">3. Intellectual Property</h2>
          <p>
            All content, including software, hardware designs, APIs, source code, compiled programs, device schematics,
            text, graphics, logos, images, and datasets provided by Mycosoft, is the property of Mycosoft or its
            licensors and is protected by international copyright and intellectual property laws. Unauthorized use,
            replication, or reverse engineering of any Mycosoft product, data, or intellectual property is strictly
            prohibited.
          </p>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold mt-12 mb-4">4. User Accounts and Access</h2>
          <p>
            If you create an account to use Mycosoft's platforms or devices, you are responsible for maintaining the
            confidentiality of your credentials and for all activities performed under your account. Unauthorized
            access, tampering, or misuse of Mycosoft accounts, devices, or platforms will result in immediate
            termination of access and may lead to legal action.
          </p>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold mt-12 mb-4">5. Privacy and Data Usage</h2>
          <p>
            Your use of Mycosoft's services is governed by our Privacy Policy, which details how we handle and protect
            your data. By using our services, you consent to the collection, analysis, and processing of data, including
            data derived from interactions with Mycosoft's devices (e.g., bioelectric signals from mycelium,
            environmental data from sensors, or simulation data). Users are prohibited from exporting, manipulating, or
            sharing data gathered from Mycosoft systems without express written consent.
          </p>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold mt-12 mb-4">6. Device and Service Usage</h2>
          <p>
            By using Mycosoft devices, including but not limited to Mushroom1, SporeBase, and other IoT-enabled tools,
            you agree to:
          </p>
          <ul>
            <li>Operate devices according to the provided user manuals and guidelines.</li>
            <li>Not modify, tamper with, or reverse-engineer hardware or software.</li>
            <li>Return or dispose of devices as instructed if access to services is terminated.</li>
          </ul>
          <p>Failure to comply with device usage policies may result in damages or liability owed to Mycosoft.</p>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold mt-12 mb-4">7. Limitation of Liability</h2>
          <p>
            Mycosoft shall not be held liable for any damages arising out of or related to the use of our devices,
            software, or facilities. This includes direct, indirect, incidental, consequential, or punitive damages
            resulting from misuse, hardware failure, software bugs, or data inaccuracies. Users assume all risks
            associated with experimental or research-based services, including environmental remediation projects and
            biological computing experiments.
          </p>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold mt-12 mb-4">8. Changes to Terms</h2>
          <p>
            Mycosoft reserves the right to amend these terms at any time. Any modifications will be effective
            immediately upon posting on the website or platform. Continued use of Mycosoft's services after changes
            signifies your acceptance of the updated terms.
          </p>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold mt-12 mb-4">9. Governing Law</h2>
          <p>
            For Services provided on or in orbit around the planet Earth or the Moon, these Terms and any disputes
            between us arising out of or related to these Terms, including disputes regarding arbitrability
            ("Disputes"), will be governed by and construed in accordance with the laws of the State of California in
            the United States. For Services provided on Mars, or in transit to Mars, the parties recognize Mars as a
            free planet and that no Earth-based government has authority or sovereignty over Martian activities.
            Accordingly, Disputes will be settled through self-governing principles, established in good faith, at the
            time of Martian settlement.
          </p>
          <p>
            This applies specifically to Mycosoft's technologies, techniques, research, experiments, patents, electronic
            fingerprints, chemical compositions, including data ownership and device access to private property, which
            is specifically designated distinct or succinct as on Earth and the Moon, in transfer to & from or
            settlement on Mars.
          </p>

          <div className="mt-12">
            <p>
              By interacting with any of Mycosoft's services, hardware, software, or data, you agree to the terms
              outlined above.
            </p>
            <p className="mt-4">
              If you have any questions about these terms, please contact us at media@mycosoft.org.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
