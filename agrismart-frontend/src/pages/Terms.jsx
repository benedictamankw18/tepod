import LegalLayout, { LSection, LList } from '../components/LegalLayout'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updatedAt="30 August 2026">
      <LSection title="1. About this agreement">
        <p>
          These Terms of Service govern your use of NKABOM AGRILINK, a marketplace that connects farmers,
          buyers, transport providers and other agri-value-chain actors. By creating an account and accepting
          these terms, you agree to use the platform lawfully, honestly, and in good faith.
        </p>
      </LSection>

      <LSection title="2. Your account">
        <LList
          items={[
            'Provide accurate details when you register: your legal name, a valid contact, and a buyer or farmer role.',
            'Keep your login credentials private. You are responsible for activity carried out on your account.',
            'Notify us promptly if you believe your account has been used without your permission.',
          ]}
        />
      </LSection>

      <LSection title="3. Listings, pre-commitments and transactions">
        <LList
          items={[
            'Farmers must describe produce accurately and honour commitments they accept.',
            'Buyers must pay the agreed amount by the due date shown on the transaction.',
            'A pre-commitment you accept creates a binding sale agreement between farmer and buyer.',
            'Transactions may include a commission deducted at the posted rate before the farmer payout.',
          ]}
        />
      </LSection>

      <LSection title="4. Verification and live photo">
        <p>
          Buyers must verify their profile with a government-issued ID and a live photo taken through the
          marketplace camera before committing to purchases. The photo confirms that the verification is
          performed by the account holder at the time of application.
        </p>
      </LSection>

      <LSection title="5. Permitted use">
        <LList
          items={[
            'You may not impersonate others, submit false information, or attempt to defraud other users.',
            'You may not scrape, reverse-engineer, or overload the platform.',
            'You may not use the platform for any unlawful purpose.',
          ]}
        />
      </LSection>

      <LSection title="6. Termination">
        <p>
          We may suspend or close accounts that breach these terms. You may stop using the platform at any
          time. Contact support if you would like your account and associated data removed.
        </p>
      </LSection>

      <LSection title="7. Contact">
        <p>
          Questions about these terms? Reach us through the in-app Support page or the contact details shown
          on our website.
        </p>
      </LSection>
    </LegalLayout>
  )
}