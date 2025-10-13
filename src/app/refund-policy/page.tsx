import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy - 6FB Methodologies Workshop',
  description:
    'Refund Policy for 6FB Methodologies Workshop. Learn about our cancellation terms, refund eligibility, and transfer options.',
};

export default function RefundPolicy() {
  return (
    <div className='min-h-screen bg-background-primary text-text-primary'>
      <div className='container mx-auto px-4 py-16 max-w-4xl'>
        <div className='mb-8'>
          <h1 className='text-4xl font-bold mb-4'>Refund Policy</h1>
          <p className='text-text-muted'>
            Last updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className='prose prose-invert max-w-none space-y-8'>
          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              1. Overview
            </h2>
            <p className='mb-4 leading-relaxed'>
              This Refund Policy governs the terms and conditions for refunds,
              cancellations, and transfers related to the 6FB Methodologies
              Workshop offered by Bossio Solution Inc. ("6FB," "we," "our," or
              "us").
            </p>
            <p className='leading-relaxed'>
              By registering for our Workshop and making payment, you
              acknowledge and agree to the terms outlined in this policy. This
              policy is designed to balance fairness to our customers with the
              operational requirements of hosting high-quality workshops.
            </p>
          </section>

          <section>
            <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-6'>
              <h2 className='text-2xl font-semibold mb-4 text-red-400'>
                🚨 Important: Hybrid Refund Policy
              </h2>
              <p className='text-lg leading-relaxed'>
                <strong>
                  All workshop registrations become FINAL and NON-REFUNDABLE
                  after whichever comes FIRST:
                </strong>
              </p>
              <ul className='mt-3 space-y-2 text-lg'>
                <li>
                  <strong>• 30 days after your purchase date</strong>, OR
                </li>
                <li>
                  <strong>• 7 days before the scheduled workshop date</strong>
                </li>
              </ul>
              <p className='mt-4 leading-relaxed'>
                This hybrid system ensures fair refund windows while allowing us
                to maintain workshop quality and manage venue logistics
                effectively.
              </p>
            </div>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              2. Refund Eligibility Timeline
            </h2>

            <div className='grid md:grid-cols-2 gap-6 mb-6'>
              <div className='bg-green-500/10 border border-green-500/20 rounded-lg p-6'>
                <h3 className='text-xl font-semibold mb-3 text-green-400'>
                  ✅ Refunds Available
                </h3>
                <p className='mb-3 font-semibold'>
                  BEFORE the cutoff date (whichever comes first):
                </p>
                <ul className='space-y-2 mb-4'>
                  <li>• Within 30 days of purchase</li>
                  <li>• More than 7 days before workshop</li>
                </ul>
                <div className='border-t border-green-500/20 pt-3'>
                  <p className='text-sm font-semibold mb-2'>Refund Details:</p>
                  <ul className='space-y-1 text-sm'>
                    <li>• Full refund minus 5% processing fee</li>
                    <li>• Processed within 5-7 business days</li>
                    <li>• Must submit cancellation request online</li>
                  </ul>
                </div>
              </div>

              <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-6'>
                <h3 className='text-xl font-semibold mb-3 text-red-400'>
                  ❌ No Refunds Available
                </h3>
                <p className='mb-3 font-semibold'>
                  AFTER the cutoff date (whichever comes first):
                </p>
                <ul className='space-y-2 mb-4'>
                  <li>• More than 30 days after purchase</li>
                  <li>• 7 days or less before workshop</li>
                </ul>
                <div className='border-t border-red-500/20 pt-3'>
                  <p className='text-sm font-semibold mb-2'>Your Options:</p>
                  <ul className='space-y-1 text-sm'>
                    <li>• Registration is final</li>
                    <li>• Transfer options may be available</li>
                    <li>• Medical emergency exceptions may apply</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-6'>
              <h4 className='font-semibold mb-3 text-blue-400'>
                📋 Hybrid Policy Examples
              </h4>

              <div className='space-y-3 text-sm'>
                <div className='bg-background-primary/20 p-3 rounded'>
                  <p className='font-semibold mb-1'>
                    Scenario A: Early Purchase
                  </p>
                  <p>• Workshop: Atlanta (Feb 23-24, 2026)</p>
                  <p>• Purchase Date: Oct 15, 2025</p>
                  <p>
                    • Refund Deadline: <strong>Nov 14, 2025</strong> (30 days
                    after purchase)
                  </p>
                  <p className='text-xs text-blue-300 mt-1'>
                    30-day limit comes first since purchase was made early
                  </p>
                </div>

                <div className='bg-background-primary/20 p-3 rounded'>
                  <p className='font-semibold mb-1'>
                    Scenario B: Late Purchase
                  </p>
                  <p>• Workshop: Dallas (Jan 25-26, 2026)</p>
                  <p>• Purchase Date: Jan 10, 2026</p>
                  <p>
                    • Refund Deadline: <strong>Jan 18, 2026</strong> (7 days
                    before workshop)
                  </p>
                  <p className='text-xs text-blue-300 mt-1'>
                    7-day workshop limit comes first since purchase was made
                    close to date
                  </p>
                </div>

                <div className='bg-background-primary/20 p-3 rounded'>
                  <p className='font-semibold mb-1'>Scenario C: Your Example</p>
                  <p>• Workshop: March 8-9, 2026</p>
                  <p>• Purchase Date: Feb 12, 2026 (24 days before)</p>
                  <p>
                    • Refund Deadline: <strong>March 1, 2026</strong> (7 days
                    before workshop)
                  </p>
                  <p className='text-xs text-blue-300 mt-1'>
                    7-day limit comes first - customer gets 17 days, not the
                    full 30
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              3. How to Request a Refund
            </h2>

            <h3 className='text-xl font-semibold mb-3'>Step-by-Step Process</h3>
            <ol className='list-decimal pl-6 mb-4 space-y-3'>
              <li>
                <strong>Submit Request:</strong> Email{' '}
                <a
                  href='mailto:refunds@6fbmethodologies.com'
                  className='text-tomb45-green hover:underline'
                >
                  refunds@6fbmethodologies.com
                </a>{' '}
                with your registration details
              </li>
              <li>
                <strong>Include Information:</strong>
                <ul className='list-disc pl-6 mt-2 space-y-1'>
                  <li>Full name and email used for registration</li>
                  <li>Workshop date and location</li>
                  <li>Reason for cancellation</li>
                  <li>Original payment confirmation</li>
                </ul>
              </li>
              <li>
                <strong>Confirmation:</strong> You'll receive confirmation
                within 24 hours
              </li>
              <li>
                <strong>Processing:</strong> Refunds processed within 5-7
                business days
              </li>
            </ol>

            <div className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4'>
              <p className='text-sm leading-relaxed'>
                <strong>⏰ Processing Note:</strong> Refunds are issued to the
                original payment method. Credit card refunds may take 3-5
                additional business days to appear on your statement depending
                on your bank.
              </p>
            </div>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              4. Transfer Options
            </h2>

            <h3 className='text-xl font-semibold mb-3'>
              Transfer to Another Person
            </h3>
            <ul className='list-disc pl-6 mb-4 space-y-2'>
              <li>
                <strong>Eligibility:</strong> Available anytime more than 7 days
                before workshop (regardless of purchase date or 30-day limit)
              </li>
              <li>
                <strong>Fee:</strong> $50 administrative fee
              </li>
              <li>
                <strong>Requirements:</strong> New attendee must meet workshop
                prerequisites
              </li>
              <li>
                <strong>Process:</strong> Submit transfer request with new
                attendee information
              </li>
            </ul>

            <h3 className='text-xl font-semibold mb-3'>
              Transfer to Future Workshop
            </h3>
            <ul className='list-disc pl-6 mb-4 space-y-2'>
              <li>
                <strong>Availability:</strong> Subject to space in future
                workshops
              </li>
              <li>
                <strong>Price Difference:</strong> You're responsible for any
                price increases
              </li>
              <li>
                <strong>Credit Validity:</strong> Transfer credits valid for 12
                months
              </li>
              <li>
                <strong>Limitations:</strong> Maximum one transfer per
                registration
              </li>
            </ul>

            <h3 className='text-xl font-semibold mb-3'>
              Emergency Transfers (Within 7 Days of Workshop)
            </h3>
            <p className='mb-4 leading-relaxed'>
              While refunds are not available within 7 days of the workshop, we
              may allow transfers in specific circumstances:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>Documented medical emergencies (hospitalization, surgery)</li>
              <li>Immediate family emergencies (death, serious illness)</li>
              <li>Military deployment or emergency service obligations</li>
              <li>
                Natural disasters or travel restrictions beyond your control
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              5. Medical Emergency Exceptions
            </h2>

            <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-4'>
              <h3 className='text-xl font-semibold mb-3 text-blue-400'>
                📋 Documentation Required
              </h3>
              <p className='mb-3 leading-relaxed'>
                For medical emergencies preventing workshop attendance, we may
                offer exceptions to our standard policy.
              </p>
              <p className='leading-relaxed'>
                <strong>
                  Required documentation must be submitted within 48 hours of
                  the workshop date:
                </strong>
              </p>
            </div>

            <ul className='list-disc pl-6 mb-4 space-y-2'>
              <li>
                Official medical documentation from a licensed healthcare
                provider
              </li>
              <li>Documentation must specify dates of treatment/recovery</li>
              <li>Must demonstrate inability to travel or attend</li>
              <li>Documentation must be on official medical letterhead</li>
            </ul>

            <h3 className='text-xl font-semibold mb-3'>
              Medical Exception Outcomes
            </h3>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Credit:</strong> Transfer credit to future workshop (no
                cash refund)
              </li>
              <li>
                <strong>Validity:</strong> Medical transfer credits valid for 18
                months
              </li>
              <li>
                <strong>Evaluation:</strong> Each case reviewed individually
              </li>
              <li>
                <strong>Final Decision:</strong> Management discretion on
                approval
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              6. Workshop Cancellation by 6FB
            </h2>

            <h3 className='text-xl font-semibold mb-3'>Force Majeure Events</h3>
            <p className='mb-4 leading-relaxed'>
              If we must cancel a workshop due to circumstances beyond our
              control, including but not limited to:
            </p>
            <ul className='list-disc pl-6 mb-4 space-y-2'>
              <li>Natural disasters (hurricanes, earthquakes, floods)</li>
              <li>Pandemic restrictions or health department orders</li>
              <li>Venue emergencies or sudden unavailability</li>
              <li>Instructor illness or emergency</li>
              <li>Government travel restrictions</li>
            </ul>

            <h3 className='text-xl font-semibold mb-3'>
              Your Options If We Cancel
            </h3>
            <div className='grid md:grid-cols-2 gap-4'>
              <div className='bg-background-secondary p-4 rounded-lg'>
                <h4 className='font-semibold mb-2 text-tomb45-green'>
                  Option 1: Full Refund
                </h4>
                <ul className='text-sm space-y-1'>
                  <li>• 100% refund of registration fee</li>
                  <li>• No processing fees deducted</li>
                  <li>• Processed within 5-7 business days</li>
                </ul>
              </div>
              <div className='bg-background-secondary p-4 rounded-lg'>
                <h4 className='font-semibold mb-2 text-tomb45-green'>
                  Option 2: Future Credit
                </h4>
                <ul className='text-sm space-y-1'>
                  <li>• 110% credit toward future workshop</li>
                  <li>• 24-month validity period</li>
                  <li>• Priority registration for rescheduled dates</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              7. Payment Plan Considerations
            </h2>

            <h3 className='text-xl font-semibold mb-3'>
              Buy Now, Pay Later (BNPL) Services
            </h3>
            <p className='mb-4 leading-relaxed'>
              If you used a BNPL service (Klarna, Afterpay, Affirm) for payment,
              please note:
            </p>
            <ul className='list-disc pl-6 mb-4 space-y-2'>
              <li>Refunds are processed back to the BNPL provider</li>
              <li>
                You remain responsible for any outstanding payments to the BNPL
                service
              </li>
              <li>
                Refund processing may take longer due to BNPL provider
                requirements
              </li>
              <li>Contact both 6FB and your BNPL provider for refund status</li>
            </ul>

            <div className='bg-orange-500/10 border border-orange-500/20 rounded-lg p-4'>
              <p className='text-sm leading-relaxed'>
                <strong>Important:</strong> If you have an outstanding BNPL
                payment plan, you must continue making payments until the refund
                is fully processed, even if you've received partial refund
                confirmation from us.
              </p>
            </div>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              8. Non-Refundable Items
            </h2>
            <p className='mb-4 leading-relaxed'>
              The following are never eligible for refund:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>Payment processing fees (Stripe, PayPal, etc.)</li>
              <li>Administrative transfer fees</li>
              <li>Travel expenses (flights, hotels, transportation)</li>
              <li>Personal expenses incurred in preparation for attendance</li>
              <li>Opportunity costs or lost business income</li>
            </ul>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              9. Dispute Resolution
            </h2>

            <h3 className='text-xl font-semibold mb-3'>
              Internal Resolution Process
            </h3>
            <ol className='list-decimal pl-6 mb-4 space-y-2'>
              <li>
                <strong>Direct Contact:</strong> Email
                refunds@6fbmethodologies.com first
              </li>
              <li>
                <strong>Escalation:</strong> Contact management at
                support@6fbmethodologies.com
              </li>
              <li>
                <strong>Final Review:</strong> Executive review for complex
                cases
              </li>
            </ol>

            <h3 className='text-xl font-semibold mb-3'>
              External Dispute Options
            </h3>
            <p className='mb-4 leading-relaxed'>
              If internal resolution is unsuccessful:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>Contact your credit card company for chargeback policies</li>
              <li>File complaints with Better Business Bureau</li>
              <li>Consult with legal counsel for significant disputes</li>
              <li>Binding arbitration as outlined in Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              10. Why This Hybrid Policy Exists
            </h2>
            <p className='mb-4 leading-relaxed'>
              Our hybrid refund policy (30 days from purchase OR 7 days before
              workshop - whichever comes first) exists to balance customer
              fairness with operational requirements:
            </p>

            <div className='grid md:grid-cols-2 gap-6'>
              <div>
                <h3 className='text-lg font-semibold mb-3 text-tomb45-green'>
                  Operational Requirements
                </h3>
                <ul className='list-disc pl-6 space-y-2 text-sm'>
                  <li>Venue capacity planning and final headcounts</li>
                  <li>Catering and material preparation</li>
                  <li>Instructor scheduling and travel arrangements</li>
                  <li>Equipment and technology setup</li>
                </ul>
              </div>
              <div>
                <h3 className='text-lg font-semibold mb-3 text-tomb45-green'>
                  Quality Assurance
                </h3>
                <ul className='list-disc pl-6 space-y-2 text-sm'>
                  <li>Optimal group size for interactive learning</li>
                  <li>Personalized attention for all attendees</li>
                  <li>Effective networking opportunities</li>
                  <li>Consistent high-quality experience</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              11. Contact Information
            </h2>
            <p className='mb-4 leading-relaxed'>
              For all refund-related inquiries, please contact us through the
              appropriate channel:
            </p>

            <div className='grid md:grid-cols-2 gap-6'>
              <div className='bg-background-secondary p-6 rounded-lg'>
                <h3 className='text-lg font-semibold mb-3 text-tomb45-green'>
                  Refund Requests
                </h3>
                <p className='mb-2'>
                  Email:{' '}
                  <a
                    href='mailto:refunds@6fbmethodologies.com'
                    className='text-tomb45-green hover:underline'
                  >
                    refunds@6fbmethodologies.com
                  </a>
                </p>
                <p className='text-sm text-text-muted'>
                  For cancellations and refund requests
                </p>
              </div>
              <div className='bg-background-secondary p-6 rounded-lg'>
                <h3 className='text-lg font-semibold mb-3 text-tomb45-green'>
                  General Support
                </h3>
                <p className='mb-2'>
                  Email:{' '}
                  <a
                    href='mailto:support@6fbmethodologies.com'
                    className='text-tomb45-green hover:underline'
                  >
                    support@6fbmethodologies.com
                  </a>
                </p>
                <p className='text-sm text-text-muted'>
                  For general questions and assistance
                </p>
              </div>
            </div>

            <div className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-6'>
              <p className='text-sm leading-relaxed'>
                <strong>Response Time:</strong> We respond to all refund
                inquiries within 24 hours during business days (Monday-Friday, 9
                AM - 5 PM CST). Emergency requests may be processed outside
                business hours.
              </p>
            </div>
          </section>

          <section className='border-t border-border-primary pt-8'>
            <h2 className='text-2xl font-semibold mb-4 text-tomb45-green'>
              12. Policy Updates
            </h2>
            <p className='mb-4 leading-relaxed'>
              This Refund Policy may be updated periodically to reflect changes
              in our operations or legal requirements. Material changes will be
              communicated to registered attendees via email at least 7 days
              before taking effect.
            </p>
            <p className='text-sm text-text-muted leading-relaxed'>
              This policy is part of our Terms of Service and is binding upon
              registration. By completing workshop registration and payment, you
              acknowledge that you have read, understood, and agree to this
              Refund Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
