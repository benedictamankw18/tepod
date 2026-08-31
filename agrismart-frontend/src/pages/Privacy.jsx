import LegalLayout, { LSection, LList } from '../components/LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updatedAt="30 August 2026">
      <LSection title="1. What we collect">
        <LList
          items={[
            'Account details you provide at registration: name, phone and/or email, username, role, and location.',
            'Profile and onboarding data such as crops, community, GPS address, and verification details.',
            'A live photo and a verification ID record when you verify as a buyer.',
            'Your device location may be captured at the moment you verify, to record where the verification happened.',
            'Activity data generated while you use the platform: listings, pre-commitments, transactions, and messages.',
          ]}
        />
      </LSection>

      <LSection title="2. How we protect your identity details">
        <p>
          Identification numbers are never stored in full. We keep only a redacted form (the last four
          characters visible) so an ID cannot be reconstructed from our records. Verification details and
          photos are visible only to you and to platform administrators performing compliance checks.
        </p>
      </LSection>

      <LSection title="3. Why we collect and use your data">
        <LList
          items={[
            'To run the marketplace: match listings, confirm sales, and settle payments.',
            'To verify buyer profiles before purchases are committed.',
            'To send SMS/email notices about offers, confirmations, payments, and reminders.',
            'To detect fraud, enforce our Terms of Service, and comply with the law.',
          ]}
        />
      </LSection>

      <LSection title="4. What we share">
        <p>
          Your listing, name, and location are visible to other marketplace users so transactions can happen.
          We do not sell your personal data. We only disclose data to service providers (for example SMS and
          mobile-money partners) to the extent needed to deliver the service, or where the law requires it.
        </p>
      </LSection>

      <LSection title="5. Your choices">
        <LList
          items={[
            'You can update your profile and preferences at any time in your account settings.',
            'You can request a copy of the data we hold about you.',
            'You can ask us to close your account and delete your personal data, subject to legal record-keeping obligations.',
          ]}
        />
      </LSection>

      <LSection title="6. Contact">
        <p>
          Privacy questions? Reach us through the in-app Support page.
        </p>
      </LSection>
    </LegalLayout>
  )
}