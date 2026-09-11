import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Neko",
  description:
    "How Neko collects, uses, and protects information when you use the Service.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neko-dark px-6 py-12 text-neko-cream">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm text-neko-muted transition-colors hover:text-neko-accent"
        >
          ← Back to Neko
        </Link>

        <h1 className="font-klein mt-8 text-3xl tracking-tight">
          Neko Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-neko-muted">
          Last Updated: [DATE — TO BE SET AT PUBLIC LAUNCH]
        </p>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              1. Introduction
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Neko (&quot;Neko,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;) provides a non-custodial software interface (the
              &quot;Interface&quot; or &quot;Service&quot;) that lets users
              interact with smart contracts on the Stellar network to access
              liquidity pools, lending and borrowing, token swaps, vaults, yield
              strategies, and fiat on/off-ramps for real-world assets
              (&quot;RWAs&quot;). This Privacy Policy explains what information
              we collect when you use the Service, how we use it, and the
              choices you have. By using the Service, you agree to the
              collection and use of information as described here.
            </p>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Neko is operated by [NEKO LEGAL ENTITY NAME — ENTITY NOT YET
              FORMED; PLACEHOLDER PENDING INCORPORATION].
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              2. Information We Collect
            </h2>

            <h3 className="mt-6 text-lg font-medium text-neko-cream">
              2.1 Account Information
            </h3>
            <p className="mt-3 leading-relaxed text-neko-muted">
              If you create an account or sign in to the Service, we (through
              our infrastructure provider, Supabase) collect your email address
              and authentication credentials, and any profile information you
              choose to provide.
            </p>

            <h3 className="mt-6 text-lg font-medium text-neko-cream">
              2.2 Wallet &amp; On-Chain Information
            </h3>
            <p className="mt-3 leading-relaxed text-neko-muted">
              To use the Service you connect a self-custodied Stellar wallet. We
              collect your public wallet address and observe the on-chain
              transactions you submit through the Interface (pool
              deposits/withdrawals, swaps, vault activity, lending/borrowing
              positions). Because the Stellar network is a public,
              permissionless blockchain, this wallet address and transaction
              data is publicly visible and permanently recorded on the ledger —
              it is not private, and we cannot alter, redact, or delete it.
            </p>

            <h3 className="mt-6 text-lg font-medium text-neko-cream">
              2.3 Identity Verification (KYC) Information for Fiat Ramps
            </h3>
            <p className="mt-3 leading-relaxed text-neko-muted">
              If you use a fiat on-ramp or off-ramp feature, identity
              verification (&quot;KYC&quot;) is performed by our third-party
              anchor/ramp partners (currently including Etherfuse and Alfred
              Pay), not by Neko. Those partners collect and store your identity
              documents and related personal information directly, under their
              own privacy policies, which we encourage you to review before
              proceeding. Neko may receive limited information from these
              partners, such as your verification status (e.g.,
              approved/pending) and the fiat transaction details necessary to
              complete the ramp (amount, currency, linked bank account
              reference), but we do not directly collect, view, or store your
              government ID or full KYC dossier.
            </p>

            <h3 className="mt-6 text-lg font-medium text-neko-cream">
              2.4 Usage &amp; Device Information
            </h3>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We use Vercel Analytics to collect aggregated, non-identifying
              usage data (such as pages visited and general performance metrics)
              to help us understand and improve the Service.
            </p>

            <h3 className="mt-6 text-lg font-medium text-neko-cream">
              2.5 Referral Information
            </h3>
            <p className="mt-3 leading-relaxed text-neko-muted">
              If you arrive via a referral link, we store the referral code
              associated with your visit so that referral rewards can be
              attributed correctly when you connect a wallet.
            </p>

            <h3 className="mt-6 text-lg font-medium text-neko-cream">
              2.6 Communications
            </h3>
            <p className="mt-3 leading-relaxed text-neko-muted">
              If you contact us directly (e.g., via email support), we retain
              the content of that communication and your contact details to
              respond to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              3. How We Use Information
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We use the information described above to: operate, maintain, and
              improve the Service; authenticate your account; process and
              display your on-chain and fiat-ramp activity within the Interface;
              attribute referral rewards; communicate with you (including
              service, security, and — where you have not opted out — product
              updates); detect, prevent, and investigate fraud, abuse, and
              violations of our Terms of Service; and comply with legal
              obligations, including sanctions screening requirements described
              in Section 8.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              4. How We Share Information
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We do not sell your personal information. We may share it with:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-neko-muted">
              <li>
                Service providers who process data on our behalf (e.g., Supabase
                for authentication/database hosting, Vercel for hosting and
                analytics), bound by confidentiality and data-processing
                obligations.
              </li>
              <li>
                Our anchor/ramp partners (currently including Etherfuse and
                Alfred Pay) to facilitate the on/off-ramp transaction you
                request.
              </li>
              <li>
                Regulators, law enforcement, or other parties where required by
                law, legal process, or to protect the rights, property, or
                safety of Neko, our users, or others.
              </li>
              <li>
                A successor entity in the event of a merger, acquisition,
                financing, or sale of assets, subject to this Policy (or a
                materially similar one).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              5. Public Blockchain Data
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              As noted in Section 2.2, activity you conduct through smart
              contracts on Stellar is recorded on a public, immutable ledger
              outside of Neko&apos;s control. Any privacy rights described below
              (e.g., deletion) apply only to information stored in Neko&apos;s
              own systems (such as your account/email) and cannot extend to
              public blockchain data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              6. Data Retention
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We retain account information for as long as your account is
              active and for a reasonable period afterward to comply with legal
              obligations, resolve disputes, and enforce our agreements. We
              retain usage/analytics data only in aggregated or anonymized form
              beyond a limited operational window.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              7. Your Rights &amp; Choices
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Depending on where you live, you may have rights to access,
              correct, or request deletion of the personal information we hold
              about you (this does not include on-chain data, per Section 5), or
              to object to or restrict certain processing. To exercise these
              rights, contact us at the email in Section 12. We will respond
              consistent with applicable law (e.g., GDPR for EEA/UK residents,
              CCPA/CPRA for California residents).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              8. Sanctions &amp; Compliance Screening
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Because Neko excludes Restricted Persons as defined in our Terms
              of Service (including OFAC-sanctioned individuals, entities, and
              jurisdictions), we and/or our service providers may screen wallet
              addresses, IP addresses, or account information against sanctions
              and fraud-prevention lists.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              9. Children&apos;s Privacy
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              The Service is not directed to, and we do not knowingly collect
              personal information from, anyone under 18. If you believe a minor
              has provided us information, contact us and we will take steps to
              delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              10. International Data Transfers
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We and our service providers may process and store information in
              countries other than your own. Where required, we rely on
              appropriate safeguards (such as standard contractual clauses) for
              such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              11. Security
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We use commercially reasonable technical and organizational
              measures to protect information in our systems. No method of
              transmission or storage is completely secure, and — because the
              Service is non-custodial — you are solely responsible for the
              security of your own wallet, private keys, and seed phrase; Neko
              never has access to them and can never recover them on your
              behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              12. Contact Us
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Questions or requests about this Privacy Policy, or to exercise
              your privacy rights, can be sent to: santiago@oppialabs.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              13. Changes to This Policy
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We may update this Privacy Policy from time to time. Material
              changes will be reflected by updating the &quot;Last Updated&quot;
              date above, and, where required by law, we will provide additional
              notice.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
