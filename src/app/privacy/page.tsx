import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - 6FB Methodologies Workshop',
  description: 'Privacy Policy for 6FB Methodologies Workshop. Learn how we collect, use, and protect your personal information.',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-text-muted">
            Last updated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">1. Introduction</h2>
            <p className="mb-4 leading-relaxed">
              6 Figure Barber LLC ("we," "our," or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website 6fbmethodologies.com, register for our workshops, or use our services.
            </p>
            <p className="leading-relaxed">
              By accessing or using our services, you agree to the collection and use of information in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
            <p className="mb-4 leading-relaxed">We may collect the following personal information:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Name and contact information (email address, phone number)</li>
              <li>Business information (barbershop name, years of experience)</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Workshop preferences and requirements</li>
              <li>Communication records and feedback</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Automatically Collected Information</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>IP address and location data</li>
              <li>Browser type and device information</li>
              <li>Website usage data and analytics</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">3. How We Use Your Information</h2>
            <p className="mb-4 leading-relaxed">We use your information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Processing workshop registrations and payments</li>
              <li>Communicating workshop details, updates, and confirmations</li>
              <li>Providing customer support and responding to inquiries</li>
              <li>Improving our services and website functionality</li>
              <li>Sending marketing communications (with your consent)</li>
              <li>Compliance with legal obligations</li>
              <li>Protecting against fraud and security threats</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">4. Information Sharing and Disclosure</h2>
            <p className="mb-4 leading-relaxed">We do not sell your personal information. We may share your information with:</p>

            <h3 className="text-xl font-semibold mb-3">Service Providers</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Stripe:</strong> For secure payment processing</li>
              <li><strong>Vercel:</strong> For website hosting and infrastructure</li>
              <li><strong>Email providers:</strong> For communication and notifications</li>
              <li><strong>Analytics services:</strong> For website performance and user insights</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Legal Requirements</h3>
            <p className="leading-relaxed">
              We may disclose your information if required by law, court order, or to protect our rights, safety, or the rights and safety of others.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">5. Data Security</h2>
            <p className="mb-4 leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>SSL encryption for data transmission</li>
              <li>Secure payment processing through PCI-compliant providers</li>
              <li>Regular security assessments and updates</li>
              <li>Limited access to personal information on a need-to-know basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">6. Your Rights and Choices</h2>
            <p className="mb-4 leading-relaxed">You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Restriction:</strong> Request limitation of processing activities</li>
            </ul>
            <p className="mt-4 leading-relaxed">
              To exercise these rights, contact us at <a href="mailto:privacy@6fbmethodologies.com" className="text-tomb45-green hover:underline">privacy@6fbmethodologies.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">7. Cookies and Tracking</h2>
            <p className="mb-4 leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze website traffic, and personalize content. You can control cookie settings through your browser preferences.
            </p>
            <h3 className="text-xl font-semibold mb-3">Types of Cookies We Use:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential cookies:</strong> Required for website functionality</li>
              <li><strong>Analytics cookies:</strong> Help us understand website usage</li>
              <li><strong>Preference cookies:</strong> Remember your settings and choices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">8. Third-Party Links</h2>
            <p className="leading-relaxed">
              Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">9. Children's Privacy</h2>
            <p className="leading-relaxed">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected such information, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">10. International Data Transfers</h2>
            <p className="leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">11. Data Retention</h2>
            <p className="leading-relaxed">
              We retain your personal information only as long as necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements. Typically, we retain customer information for 7 years after the last workshop attendance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">12. Changes to This Privacy Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">13. Contact Information</h2>
            <p className="mb-4 leading-relaxed">
              If you have any questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="bg-background-secondary p-6 rounded-lg">
              <p className="mb-2"><strong>6 Figure Barber LLC</strong></p>
              <p className="mb-2">Email: <a href="mailto:privacy@6fbmethodologies.com" className="text-tomb45-green hover:underline">privacy@6fbmethodologies.com</a></p>
              <p className="mb-2">General Inquiries: <a href="mailto:dre@tomb45.com" className="text-tomb45-green hover:underline">dre@tomb45.com</a></p>
              <p>Workshop Support: <a href="mailto:dre@tomb45.com" className="text-tomb45-green hover:underline">dre@tomb45.com</a></p>
            </div>
          </section>

          <section className="border-t border-border-primary pt-8">
            <p className="text-sm text-text-muted leading-relaxed">
              This Privacy Policy is designed to comply with applicable privacy laws including GDPR, CCPA, and other relevant regulations.
              If you are a California resident, you may have additional rights under the California Consumer Privacy Act (CCPA).
              Please contact us for more information about your specific rights.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}