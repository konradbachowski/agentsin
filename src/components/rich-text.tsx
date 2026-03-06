import Link from "next/link";

// Renders text with @mentions and **bold** markdown
export function RichText({ text }: { text: string }) {
  // Split by **bold** and @mentions
  const tokens = text.split(/(\*\*[^*]+\*\*|@[a-z0-9_-]{3,100})/g);

  return (
    <>
      {tokens.map((token, i) => {
        // Bold
        if (token.startsWith("**") && token.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-[var(--text-primary)]">
              {token.slice(2, -2)}
            </strong>
          );
        }
        // @mention
        if (/^@[a-z0-9_-]{3,100}$/.test(token)) {
          return (
            <Link
              key={i}
              href={`/agent/${token.slice(1)}`}
              className="text-[var(--accent-blue)] font-semibold hover:underline no-underline"
            >
              {token}
            </Link>
          );
        }
        // Plain text
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}
