import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { ChevronLeft, ShieldCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ScanScam" },
      { name: "description", content: "How ScanScam collects, uses and protects your data." },
    ],
  }),
  component: PrivacyPolicy,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#1e3a5f] bg-[#12233d] p-4">
      <h2 className="mb-2 text-base font-black text-white">{title}</h2>
      <div className="space-y-2 text-sm text-[#c9d4e2]">{children}</div>
    </section>
  );
}

function PrivacyPolicy() {
  const router = useRouter();
  return (
    <div className="min-h-screen w-full" style={{ background: "#0A1628" }}>
      <div className="mx-auto max-w-[720px] px-4 pb-16 pt-4 text-white">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => router.history.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1e3a5f] bg-[#12233d]"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-black">
              <ShieldCheck className="mr-1 inline h-5 w-5 text-[#FF2D55]" /> ScanScam Privacy Policy
            </h1>
            <p className="text-xs text-[#8899aa]">Last updated: June 2026</p>
          </div>
        </div>

        <div className="space-y-3">
          <Section title="1. Who We Are">
            <p>
              ScanScam India is a free fraud detection app built to protect Indian citizens from UPI fraud, scam
              calls and fake messages.
            </p>
            <p>Contact: <span className="text-[#FF2D55]">privacy@scanscam.in</span></p>
          </Section>

          <Section title="2. What We Collect">
            <p className="font-bold text-white">What you give us voluntarily:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Scam reports you submit</li>
              <li>Phone numbers you check (NOT stored after checking)</li>
              <li>UPI IDs you verify (NOT stored after checking)</li>
              <li>Screenshots for analysis (DELETED within 60 seconds)</li>
            </ul>
            <p className="mt-2 font-bold text-white">What we collect automatically:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Approximate city (for fraud map)</li>
              <li>Anonymous app usage stats</li>
              <li>Device type and OS version</li>
            </ul>
            <p className="mt-2 font-bold text-white">What we NEVER collect:</p>
            <ul className="ml-4 list-disc space-y-1 text-[#00C853]">
              <li>Your real name</li>
              <li>Your phone number</li>
              <li>Your email address</li>
              <li>Your bank details</li>
              <li>Your personal UPI ID</li>
              <li>Any payment information</li>
              <li>Contacts from your phone</li>
              <li>Photos from your gallery</li>
            </ul>
          </Section>

          <Section title="3. How We Use Data">
            <ul className="ml-4 list-disc space-y-1">
              <li>Show fraud on live map (anonymous)</li>
              <li>Improve scam detection</li>
              <li>Send city fraud alerts</li>
              <li>Generate fraud statistics</li>
              <li>Share with law enforcement only if legally required</li>
            </ul>
            <p className="mt-2 font-bold text-white">We NEVER:</p>
            <ul className="ml-4 list-disc space-y-1 text-[#FF2D55]">
              <li>Sell data to anyone</li>
              <li>Use data for ads</li>
              <li>Share personal info with companies</li>
            </ul>
          </Section>

          <Section title="4. Data Security">
            <p>All data encrypted at rest and transit. Stored on secure servers.</p>
            <p>Reports stored without user identity. Screenshots deleted after 60 seconds.</p>
            <p>No login required means no personal account data ever stored.</p>
          </Section>

          <Section title="5. Your Rights">
            <ul className="ml-4 list-disc space-y-1">
              <li>Delete your submitted reports</li>
              <li>Opt out of analytics</li>
              <li>Request full data deletion</li>
            </ul>
            <p>Email: <span className="text-[#FF2D55]">privacy@scanscam.in</span> — we respond within 48 hours.</p>
          </Section>

          <Section title="6. Third Party Services">
            <ul className="ml-4 list-disc space-y-1">
              <li>Supabase — database storage</li>
              <li>Groq AI — scam text analysis</li>
              <li>OpenStreetMap — map display</li>
            </ul>
            <p className="text-xs text-[#8899aa]">These services have their own privacy policies.</p>
          </Section>

          <Section title="7. Children">
            <p>ScanScam is not for users under 13 years. We do not knowingly collect data from children.</p>
          </Section>

          <Section title="8. Policy Updates">
            <p>We update this policy when needed. Major changes notified via app. Check this page for latest version.</p>
          </Section>

          <Section title="9. Contact">
            <p>Email: <span className="text-[#FF2D55]">privacy@scanscam.in</span></p>
            <p>Response time: Within 48 hours</p>
          </Section>

          <button
            onClick={() => router.history.back()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C853] py-4 text-sm font-black text-white shadow-lg shadow-[#00C853]/30 active:scale-[0.98]"
          >
            <CheckCircle2 className="h-5 w-5" /> I Understand — Go Back to App
          </button>

          <Link to="/" className="mt-2 block text-center text-xs text-[#8899aa]">
            Or return to home →
          </Link>
        </div>
      </div>
    </div>
  );
}
