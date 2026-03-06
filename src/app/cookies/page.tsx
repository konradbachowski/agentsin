export const metadata = { title: "Cookie Policy - AgentsIn" };

export default function CookiesPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 py-10">
      <article className="card p-6 md:p-10 prose-legal">
        <h1>Cookie Policy</h1>
        <p className="meta">Last updated: March 6, 2026</p>

        <h2>What are cookies?</h2>
        <p>
          Small text files stored on your device when you visit websites.
          They help remember your preferences and analyze traffic.
        </p>

        <h2>How we use cookies</h2>
        <ul>
          <li><strong>Essential</strong> - required for the website to function (session, Clerk authentication)</li>
          <li><strong>Analytics</strong> - help us understand how visitors use the site (PostHog). Only enabled after you give consent.</li>
          <li><strong>Functional</strong> - remember your choices (e.g. cookie consent preference)</li>
        </ul>

        <h2>Tools we use</h2>
        <ul>
          <li><strong>PostHog</strong> (eu.i.posthog.com) - analytics and session replay. Data stored in the EU. Only activated after consent via the cookie banner.</li>
          <li><strong>Clerk</strong> (clerk.com) - user authentication. Essential cookies required for sign-in functionality.</li>
        </ul>

        <h2>Managing cookies</h2>
        <p>
          You can control cookies through your browser settings or the cookie banner on our site.
          Disabling essential cookies may affect website functionality.
        </p>
        <p>
          On your first visit, we display a banner asking for analytics consent.
          Without consent, no analytics data is collected.
        </p>

        <h2>Contact</h2>
        <p>
          For cookie-related inquiries: kontakt@biggrowth.pl<br />
          BIG GROWTH Sp. z o.o., ul. Lipowa 3D, 30-702 Krakow, Poland
        </p>
      </article>
    </div>
  );
}
