import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Neko",
  description:
    "Terms governing your access to and use of the Neko website and interface.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
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
          Neko Terms of Service
        </h1>
        <p className="mt-2 text-sm text-neko-muted">
          Last Updated: September 27, 2026
        </p>

        <p className="mt-6 leading-relaxed text-neko-muted">
          PLEASE READ THESE TERMS CAREFULLY. THEY INCLUDE IMPORTANT DISCLAIMERS,
          RISK WARNINGS, AND LIMITATIONS OF LIABILITY.
        </p>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of the Neko website, interface, and related services
              (collectively, the &quot;Service&quot;), provided by the Neko
              founding team (&quot;Neko,&quot; &quot;we,&quot; &quot;us&quot;).
              By accessing or using the Service, you agree to be bound by these
              Terms and by our Privacy Policy. If you do not agree, do not use
              the Service.
            </p>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Neko has not yet formed a legal entity. The Service is currently
              developed and operated by its founding team. Once a legal entity
              is formed, we will update these Terms to identify it as the
              operator of the Service, and it will assume the rights and
              obligations described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              2. Description of the Service
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Neko is a non-custodial software interface that lets users
              interact directly, from their own self-custodied wallet, with
              smart contracts deployed on the Stellar network, including
              features for liquidity pools (lending/borrowing), token swaps,
              discovery, automated strategies, vaults, and fiat on/off-ramps for
              real-world assets. Neko does not operate as a bank, broker-dealer,
              money transmitter, custodian, or investment adviser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              3. Eligibility &amp; Restricted Persons
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              You must be at least 18 years old and have the legal capacity to
              enter into these Terms. The Service is not offered to, and may not
              be used by:
            </p>
            <p className="mt-3 leading-relaxed text-neko-muted">
              (a) any person or entity located in, incorporated in, or a
              resident of a jurisdiction where use of the Service would be
              illegal, or on the U.S. Treasury OFAC Specially Designated
              Nationals list or comparable sanctions lists;
            </p>
            <p className="mt-3 leading-relaxed text-neko-muted">
              (b) &quot;U.S. Persons,&quot; as defined by applicable U.S.
              regulations; or
            </p>
            <p className="mt-3 leading-relaxed text-neko-muted">
              (c) any jurisdiction embargoed or restricted by the U.S. or other
              applicable governments (each, a &quot;Restricted Person&quot;;
              such jurisdictions, &quot;Restricted Territories&quot;).
            </p>
            <p className="mt-3 leading-relaxed text-neko-muted">
              By using the Service, you represent and warrant that you are not a
              Restricted Person and are not accessing the Service from a
              Restricted Territory. We may restrict or terminate access if we
              determine or suspect you do not meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              4. Non-Custodial Nature of the Service; No Money Transmission
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Neko never takes custody or control of your digital assets,
              private keys, or fiat funds. All transactions you initiate are
              executed by smart contracts on the Stellar network directly from
              your own wallet; Neko merely provides software that helps you
              construct and submit those transactions. You are solely
              responsible for the security of your wallet, private keys, and
              seed phrase, and for the accuracy of any transaction you submit;
              blockchain transactions are generally irreversible. Neko is not a
              party to, and does not guarantee the performance of, any smart
              contract, and cannot reverse, refund, or recover a transaction
              once submitted to the network.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              5. Fiat On/Off-Ramps and Third-Party Services
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Fiat on-ramp and off-ramp functionality is provided through
              independent, third-party regulated partners (&quot;Anchors,&quot;
              currently including Etherfuse and Alfred Pay), not by Neko. When
              you use these features, you are entering into a separate agreement
              with the applicable Anchor and will be subject to their terms,
              KYC/identity-verification requirements, and fees. Neko is not
              responsible for the acts, omissions, availability, or performance
              of any Anchor or other third-party service (including wallet
              providers, price oracles, or RWA issuers) integrated with or
              linked from the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              6. Risk Disclosures
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              By using the Service, you acknowledge and accept significant
              risks, including but not limited to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-neko-muted">
              <li>
                Smart contract risk: smart contracts may contain bugs,
                vulnerabilities, or be exploited, which could result in
                permanent loss of funds.
              </li>
              <li>
                Market &amp; liquidity risk: digital assets and RWA-backed
                tokens are volatile and may lose some or all value; pools,
                vaults, and strategies may experience impermanent loss,
                slippage, or be unable to be exited at expected prices.
              </li>
              <li>
                No insurance: assets used with the Service are not insured or
                guaranteed by any government agency (e.g., no FDIC or SIPC
                coverage) or by Neko.
              </li>
              <li>
                No guaranteed yield: any displayed or historical yield, APY, or
                strategy performance is not a guarantee of future results.
              </li>
              <li>
                Regulatory risk: the legal and regulatory treatment of digital
                assets and RWAs is uncertain and evolving, and could adversely
                affect the Service or your ability to use it.
              </li>
              <li>
                Network risk: the Stellar network, RPC providers, or your wallet
                software could experience outages, congestion, or bugs outside
                Neko&apos;s control.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed text-neko-muted">
              You are solely responsible for evaluating these risks and should
              not use the Service with funds you cannot afford to lose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              7. No Investment, Financial, or Tax Advice
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Nothing in the Service constitutes investment, financial, legal,
              or tax advice, or a recommendation or offer to buy, sell, or hold
              any asset. You are solely responsible for your own decisions and
              for any applicable tax obligations arising from your use of the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">8. Fees</h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Use of certain features may involve network (&quot;gas&quot;)
              fees, protocol fees, or fees charged by Anchors, which are
              disclosed within the Interface at the time of the relevant
              transaction where applicable. Neko may change its fees at any time
              with notice through the Interface.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              9. Prohibited Conduct
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              You agree not to: violate any applicable law or regulation; use
              the Service to launder money or finance illegal activity;
              interfere with or disrupt the Service or attempt to gain
              unauthorized access to it; use bots or automated means to abuse
              the Service in a way that harms other users; misrepresent your
              identity or eligibility; or use the Service if you are a
              Restricted Person.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              10. Intellectual Property
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              The Service, including its software, design, and branding, is
              owned by Neko or its licensors and is protected by intellectual
              property laws. Subject to your compliance with these Terms, we
              grant you a limited, non-exclusive, non-transferable, revocable
              license to access and use the Service for its intended purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              11. Disclaimers
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
              IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT. WE
              DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
              OR SECURE, OR THAT ANY SMART CONTRACT WILL BE FREE OF
              VULNERABILITIES.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              12. Limitation of Liability
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEKO AND ITS OFFICERS,
              EMPLOYEES, AND AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
              LOSS OF PROFITS, DATA, OR DIGITAL ASSETS, ARISING FROM YOUR USE OF
              THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              NEKO&apos;S TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE
              TERMS WILL NOT EXCEED THE GREATER OF (A) THE FEES YOU PAID TO NEKO
              DIRECTLY (EXCLUDING NETWORK/ANCHOR FEES) IN THE 12 MONTHS BEFORE
              THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              13. Indemnification
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              You agree to indemnify and hold Neko harmless from any claims,
              losses, or expenses (including reasonable attorneys&apos; fees)
              arising from your use of the Service, your violation of these
              Terms, or your violation of any law or third-party right.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              14. Governing Law
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              These Terms, and any dispute arising out of or relating to them or
              the Service, are governed by the laws of the Republic of Costa
              Rica, without regard to its conflict-of-law rules. Subject to any
              mandatory rights you may have under the laws of your country of
              residence, you agree that the courts located in San José, Costa
              Rica will have exclusive jurisdiction over any such dispute.
              Before filing any claim, you agree to first contact us at the
              email in Section 18 and attempt in good faith to resolve the
              dispute informally for at least 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              15. Modifications to the Service and These Terms
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We may modify or discontinue the Service, in whole or in part, at
              any time. We may also update these Terms from time to time;
              material changes will be reflected by updating the &quot;Last
              Updated&quot; date, and continued use of the Service after changes
              take effect constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              16. Termination
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              We may suspend or terminate your access to the Service at any
              time, for any reason, including if we believe you have violated
              these Terms. Because the Service is non-custodial, termination of
              your access to the Interface does not affect your ability to
              interact with the underlying smart contracts directly or affect
              assets already in your own wallet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              17. Miscellaneous
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              If any provision of these Terms is found unenforceable, the
              remaining provisions remain in full force. These Terms (together
              with the Privacy Policy) constitute the entire agreement between
              you and Neko regarding the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neko-cream">
              18. Contact Us
            </h2>
            <p className="mt-3 leading-relaxed text-neko-muted">
              Questions about these Terms can be sent to: santiago@oppialabs.com
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
