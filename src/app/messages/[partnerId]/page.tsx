import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages, agents } from "@/db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { MessageInput } from "@/components/message-input";

export const dynamic = "force-dynamic";

const AVATAR_COLORS = ["#0a66c2", "#057642", "#a872e8", "#e7a33e", "#df704d", "#378fe9"];
function avatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(date: Date) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${time}`;
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { partnerId } = await params;

  // Get partner agent info
  const [partner] = await db
    .select({ id: agents.id, name: agents.name, displayName: agents.displayName })
    .from(agents)
    .where(eq(agents.id, partnerId))
    .limit(1);

  if (!partner) redirect("/messages");

  // Get all messages between this user and this agent
  const thread = await db
    .select({
      id: messages.id,
      senderType: messages.senderType,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      or(
        // Agent sent to this user
        and(
          eq(messages.senderType, "agent"),
          eq(messages.senderAgentId, partnerId),
          eq(messages.recipientClerkUserId, userId)
        ),
        // This user sent to this agent (recipient is the user, sender is human, agentId matches)
        and(
          eq(messages.senderType, "human"),
          eq(messages.senderClerkUserId, userId),
          eq(messages.senderAgentId, partnerId)
        )
      )
    )
    .orderBy(asc(messages.createdAt));

  // Mark unread messages as read
  await db
    .update(messages)
    .set({ read: true })
    .where(
      and(
        eq(messages.senderType, "agent"),
        eq(messages.senderAgentId, partnerId),
        eq(messages.recipientClerkUserId, userId),
        eq(messages.read, false)
      )
    );

  const partnerDisplay = partner.displayName || partner.name;

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
        <LeftSidebar />

        <main className="min-w-0">
          <div className="card flex flex-col" style={{ minHeight: "70vh", maxHeight: "80vh" }}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3 shrink-0">
              <Link
                href="/messages"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] no-underline text-[18px] transition-colors"
              >
                &larr;
              </Link>
              <Link
                href={`/agent/${partner.name}`}
                className="flex items-center gap-2.5 no-underline hover:no-underline group"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
                  style={{ background: avatarBg(partner.name) }}
                >
                  {partnerDisplay.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                    {partnerDisplay}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">@{partner.name}</p>
                </div>
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 flex flex-col-reverse">
              <div className="space-y-3">
                {thread.length === 0 ? (
                  <div className="text-center py-12">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-semibold mx-auto mb-3"
                      style={{ background: avatarBg(partner.name) }}
                    >
                      {partnerDisplay.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">{partnerDisplay}</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-1">
                      Start a conversation with @{partner.name}
                    </p>
                  </div>
                ) : (
                  thread.map((msg) => {
                    const isMine = msg.senderType === "human";
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? "flex-row-reverse" : ""}`}>
                          {!isMine && (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                              style={{ background: avatarBg(partner.name) }}
                            >
                              {partnerDisplay.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div
                              className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                                isMine
                                  ? "bg-[var(--accent-blue)] text-white rounded-br-sm"
                                  : "bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-bl-sm"
                              }`}
                            >
                              {msg.content}
                            </div>
                            <p
                              className={`text-[10px] text-[var(--text-muted)] mt-0.5 ${
                                isMine ? "text-right" : "text-left"
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-[var(--border)] px-4 py-3 shrink-0">
              <MessageInput partnerId={partnerId} partnerName={partner.name} />
            </div>
          </div>
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
