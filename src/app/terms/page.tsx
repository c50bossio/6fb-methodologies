import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - 6FB Methodologies Workshop',
  description: 'Terms of Service for 6FB Methodologies Workshop. Review our terms and conditions for workshop registration and attendance.',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
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
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">1. Agreement to Terms</h2>
            <p className="mb-4 leading-relaxed">
              These Terms of Service ("Terms") constitute a legally binding agreement between you and 6 Figure Barber LLC ("6FB," "we," "our," or "us") regarding your use of our website 6fbmethodologies.com and participation in our 6FB Methodologies Workshop ("Workshop" or "Services").
            </p>
            <p className="leading-relaxed">
              By registering for our Workshop, making a payment, or using our website, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">2. Workshop Registration and Payment</h2>

            <h3 className="text-xl font-semibold mb-3">Registration Requirements</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>You must be at least 18 years old to register</li>
              <li>You must be a licensed barber or barbershop owner</li>
              <li>All registration information must be accurate and complete</li>
              <li>Registration is subject to availability and confirmation</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Payment Terms</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Payment is required in full at the time of registration</li>
              <li>We accept major credit cards and buy-now-pay-later options through Stripe</li>
              <li>All prices are in USD and include applicable taxes</li>
              <li>Payment plans, when available, must be completed before the Workshop date</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Confirmation and Tickets</h3>
            <p className="leading-relaxed">
              Upon successful payment, you will receive a confirmation email with your workshop details and ticket information. You must present this confirmation for Workshop entry.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">3. Refund and Cancellation Policy</h2>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-3 text-yellow-400">⚠️ Important Refund Policy</h3>
              <p className="leading-relaxed">
                <strong>All workshop registrations are FINAL and NON-REFUNDABLE 30 days prior to the workshop date.</strong>
                This policy ensures we can maintain workshop quality and manage venue capacity effectively.
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-3">Refund Eligibility</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>More than 30 days before Workshop:</strong> Full refund minus 5% processing fee</li>
              <li><strong>30 days or less before Workshop:</strong> No refunds available</li>
              <li><strong>Workshop cancellation by 6FB:</strong> Full refund or credit toward future workshop</li>
              <li><strong>Force majeure events:</strong> Credit toward future workshop (no cash refund)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Transfer Policy</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Ticket transfers to other individuals: $50 administrative fee (if more than 30 days before)</li>
              <li>Transfer to future workshop date: Subject to availability and price difference</li>
              <li>No transfers permitted within 30 days of Workshop</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Medical Emergencies</h3>
            <p className="leading-relaxed">
              In case of documented medical emergencies preventing attendance, we may offer a credit toward a future workshop at our sole discretion. Medical documentation must be provided within 48 hours of the Workshop date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">4. Workshop Content and Intellectual Property</h2>

            <h3 className="text-xl font-semibold mb-3">Proprietary Content</h3>
            <p className="mb-4 leading-relaxed">
              All Workshop content, materials, methodologies, and techniques are proprietary to 6 Figure Barber LLC and protected by intellectual property laws. This includes but is not limited to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>The "6FB Methodologies" system and techniques</li>
              <li>Training materials, handouts, and presentations</li>
              <li>Video recordings and audio content</li>
              <li>Business templates and worksheets</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Permitted Use</h3>
            <p className="mb-4 leading-relaxed">You may use the Workshop content solely for:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Implementing techniques in your own barbershop business</li>
              <li>Personal professional development</li>
              <li>Training employees in your barbershop (with restrictions)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Prohibited Activities</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Recording, photographing, or live-streaming Workshop content</li>
              <li>Reproducing or distributing Workshop materials</li>
              <li>Teaching or selling 6FB methodologies to others</li>
              <li>Creating competing training programs using our content</li>
              <li>Reverse engineering or copying our business systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">5. Code of Conduct</h2>
            <p className="mb-4 leading-relaxed">Workshop attendees must adhere to the following standards:</p>

            <h3 className="text-xl font-semibold mb-3">Professional Behavior</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Treat all attendees, instructors, and staff with respect</li>
              <li>Maintain confidentiality of other attendees' business information</li>
              <li>Participate constructively in discussions and activities</li>
              <li>Arrive punctually and remain for the entire Workshop</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Prohibited Conduct</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Disruptive, harassing, or discriminatory behavior</li>
              <li>Soliciting other attendees for business purposes</li>
              <li>Intoxication or substance abuse</li>
              <li>Violation of venue policies or local laws</li>
            </ul>

            <p className="leading-relaxed">
              Violation of this Code of Conduct may result in immediate removal from the Workshop without refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">6. Disclaimers and Limitations</h2>

            <h3 className="text-xl font-semibold mb-3">Educational Purpose</h3>
            <p className="mb-4 leading-relaxed">
              The Workshop is for educational purposes only. While we share proven methodologies, individual results may vary. We do not guarantee specific business outcomes, revenue increases, or success levels.
            </p>

            <h3 className="text-xl font-semibold mb-3">Business Advice Disclaimer</h3>
            <p className="mb-4 leading-relaxed">
              Content provided is for informational purposes and should not be considered as professional business, legal, or financial advice. Consult with qualified professionals before implementing any strategies discussed.
            </p>

            <h3 className="text-xl font-semibold mb-3">Limitation of Liability</h3>
            <p className="leading-relaxed">
              6FB's total liability to you for any claims related to the Workshop shall not exceed the amount you paid for registration. We are not liable for indirect, incidental, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">7. Force Majeure</h2>
            <p className="leading-relaxed">
              We are not liable for failure to perform due to events beyond our reasonable control, including but not limited to natural disasters, pandemics, government regulations, venue cancellations, or Acts of God. In such cases, we will offer rescheduling or credit toward future workshops.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">8. Privacy and Data Protection</h2>
            <p className="leading-relaxed">
              Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated by reference into these Terms. By using our Services, you consent to our privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">9. Modifications to Terms</h2>
            <p className="leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be communicated via email to registered users at least 30 days before taking effect. Continued use of our Services after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">10. Governing Law and Dispute Resolution</h2>

            <h3 className="text-xl font-semibold mb-3">Governing Law</h3>
            <p className="mb-4 leading-relaxed">
              These Terms are governed by the laws of the State of Texas, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold mb-3">Dispute Resolution</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Informal Resolution:</strong> Contact us first to resolve disputes informally</li>
              <li><strong>Binding Arbitration:</strong> Unresolved disputes will be settled through binding arbitration</li>
              <li><strong>Class Action Waiver:</strong> You waive the right to participate in class action lawsuits</li>
              <li><strong>Jurisdiction:</strong> Texas state and federal courts have exclusive jurisdiction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">11. Severability</h2>
            <p className="leading-relaxed">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect. Invalid provisions will be replaced with enforceable provisions that most closely match the original intent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-tomb45-green">12. Contact Information</h2>
            <p className="mb-4 leading-relaxed">
              For questions about these Terms or Workshop registration, please contact us:
            </p>
            <div className="bg-background-secondary p-6 rounded-lg">
              <p className="mb-2"><strong>6 Figure Barber LLC</strong></p>
              <p className="mb-2">General Inquiries: <a href="mailto:info@6fbmethodologies.com" className="text-tomb45-green hover:underline">info@6fbmethodologies.com</a></p>
              <p className="mb-2">Workshop Support: <a href="mailto:support@6fbmethodologies.com" className="text-tomb45-green hover:underline">support@6fbmethodologies.com</a></p>
              <p>Legal Matters: <a href="mailto:legal@6fbmethodologies.com" className="text-tomb45-green hover:underline">legal@6fbmethodologies.com</a></p>
            </div>
          </section>

          <section className="border-t border-border-primary pt-8">
            <p className="text-sm text-text-muted leading-relaxed">
              By registering for the 6FB Methodologies Workshop, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. These Terms constitute the entire agreement between you and 6 Figure Barber LLC regarding your use of our Services.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}