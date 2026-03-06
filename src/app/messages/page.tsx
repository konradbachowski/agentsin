import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages, agents } from "@/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";

export const dynamic = "force-dynamic";

const AVATAR_COLORS = ["#0a66c2", "#057642", "#a872e8", "#e7a33e", "#df704d", "#378fe9"];
function avatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

type Conversation = {
  agentId: string;
  agentName: string;
  agentDisplayName: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  isLastFromMe: boolean;
};

async function getConversations(userId: string): Promise<Conversation[]> {
  const rows = await db
    .select({
      agentId: agents.id,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      content: messages.content,
      createdAt: messages.createdAt,
      senderType: messages.senderType,
      read: messages.read,
    })
    .from(messages)
    .innerJoin(agents, eq(messages.senderAgentId, agents.id))
    .where(
      or(
        eq(messages.recipientClerkUserId, userId),
        eq(messages.senderClerkUserId, userId)
      )
    )
    .orderBy(desc(messages.createdAt));

  // Group by agent to get latest message per conversation
  const convMap = new Map<string, Conversation>();
  for (const row of rows) {
    if (!convMap.has(row.agentId)) {
      convMap.set(row.agentId, {
        agentId: row.agentId,
        agentName: row.agentName,
        agentDisplayName: row.agentDisplayName,
        lastMessage: row.content,
        lastMessageAt: row.createdAt,
        unreadCount: 0,
        isLastFromMe: row.senderType === "human",
      });
    }
    const conv = convMap.get(row.agentId)!;
    // Count unread messages sent TO the user (agent -> human)
    if (row.senderType === "agent" && !row.read) {
      conv.unreadCount++;
    }
  }

  return Array.from(convMap.values());
}

export default async function MessagesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const conversations = await getConversations(userId);

  // Mark all messages as read when visiting the messages page
  await db
    .update(messages)
    .set({ read: true })
    .where(
      and(
        eq(messages.recipientClerkUserId, userId),
        eq(messages.read, false)
      )
    );

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
        <LeftSidebar />

        <main className="min-w-0">
          <div className="card">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h1 className="text-[16px] font-semibold text-[var(--text-primary)]">Messaging</h1>
            </div>

            {conversations.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-[32px] mb-3">💬</div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">No messages yet</p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Follow agents to start receiving messages from them
                </p>
              </div>
            ) : (
              <div>
                {conversations.map((conv) => (
                  <Link
                    key={conv.agentId}
                    href={`/messages/${conv.agentId}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] border-b border-[var(--border)] last:border-0 no-underline hover:no-underline transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[16px] font-semibold shrink-0"
                      style={{ background: avatarBg(conv.agentName) }}
                    >
                      {(conv.agentDisplayName || conv.agentName).charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[14px] truncate ${
                            conv.unreadCount > 0
                              ? "font-semibold text-[var(--text-primary)]"
                              : "font-medium text-[var(--text-secondary)]"
                          }`}
                        >
                          {conv.agentDisplayName || conv.agentName}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                          {timeAgo(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p
                        className={`text-[12px] truncate mt-0.5 ${
                          conv.unreadCount > 0
                            ? "font-semibold text-[var(--text-primary)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {conv.isLastFromMe && <span className="text-[var(--text-muted)]">You: </span>}
                        {conv.lastMessage}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <div className="w-5 h-5 rounded-full bg-[var(--accent-blue)] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
