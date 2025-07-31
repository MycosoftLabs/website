import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - Mycosoft",
  description: "Learn how Mycosoft protects and handles your data",
}

export default function PrivacyPage() {
  return (
    <div className="container py-6 md:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-xl text-muted-foreground mb-8">Effective Date: 07/20/2024</p>

          <h2 className="text-2xl font-bold mt-12 mb-4">1. Introduction</h2>
          <p>
            Mycosoft ("we," "our," or "us") is committed to protecting the privacy of our users ("you" or "your"). This
            Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our
            website, mycosoft.org, use our services, or interact with our products. Please read this Privacy Policy
            carefully. If you disagree with this Privacy Policy's terms, please do not access the site.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">2. Information We Collect</h2>
          <p>
            We may collect information about you in a variety of ways. The information we may collect on the site
            includes:
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-2">Personal Data:</h3>
          <p>
            Personally identifiable information, such as your name, shipping address, email address, and telephone
            number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily
            give to us when you register with the site or our services, or when you choose to participate in various
            activities related to the site and our services.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-2">Derivative Data:</h3>
          <p>
            Information our servers automatically collect when you access the site, such as your IP address, browser
            type, operating system, access times, and the pages you have viewed directly before and after accessing the
            site.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-2">Financial Data:</h3>
          <p>
            We may collect Financial information related to your payment method (e.g., valid credit card number, card
            brand, expiration date) when you purchase, order, return, exchange, or request information about our
            services from the site.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-2">Data From Social Networks:</h3>
          <p>
            User information from social networking sites, such as Facebook, Google, X, and others including your name,
            your social network username, location, gender, birth date, email address, profile picture, and public data
            for contacts, if you connect your account to such social networks.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-2">Mobile Device Data:</h3>
          <p>
            Device information, such as your mobile device ID, model, and manufacturer, and information about the
            location of your device, if you access the site from a mobile device.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-2">Machine Data:</h3>
          <p>
            Data from our devices including environmental data, subsurface data, network capabilities, and location
            data. This data is collected to enhance the functionality and user experience of our products and services.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">3. Use of Your Information</h2>
          <p>We use the information we collect in the following ways:</p>
          <ul>
            <li>Provide, operate, and maintain our site and services</li>
            <li>Communicate with you</li>
            <li>Personalize your experience</li>
            <li>Process transactions</li>
            <li>Improve our services</li>
            <li>Security and fraud prevention</li>
            <li>Compliance</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">4. Disclosure of Your Information</h2>
          <p>
            We may share information we have collected about you in certain situations. Your information may be
            disclosed as follows:
          </p>
          <ul>
            <li>By Law or to Protect Rights</li>
            <li>Third-Party Service Providers</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">5. Security of Your Information</h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information.
            All technologies we build are end-to-end encrypted to ensure the highest level of security.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">6. Blockchain Data Collection</h2>
          <p>
            All data gathered from our devices is embedded in a public blockchain such as Bitcoin. This includes
            environmental data, subsurface data, network capabilities, and location data.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">7. Data Use and Retention</h2>
          <p>
            Mycosoft will never sell or use any user data for marketing or advertising purposes. All data will be used
            in perpetuity for science, research, and training AI models, devices, and for use in scientific discovery.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">8. Your Privacy Rights</h2>
          <p>Depending on your location, you may have the following rights:</p>
          <ul>
            <li>Access</li>
            <li>Rectification</li>
            <li>Erasure</li>
            <li>Restriction</li>
            <li>Portability</li>
            <li>Objection</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">9. Contact Us</h2>
          <p>
            If you have questions or comments about this Privacy Policy, please contact us at:
            <br />
            Email: privacy@mycosoft.org
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">10. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time in order to reflect changes to our practices or for
            other operational, legal, or regulatory reasons.
          </p>

          <div className="text-sm text-muted-foreground mt-12">
            <p>Last updated: January 2024</p>
          </div>
        </div>
      </div>
    </div>
  )
}
