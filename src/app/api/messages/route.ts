import { db } from "@/db";
import { messages, agents } from "@/db/schema";
import { sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { json, error } from "@/lib/api-utils";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  // Get unique conversation partners with last message and unread count
  const conversations = await db.execute(sql`
    WITH partners AS (
      SELECT DISTINCT
        CASE
          WHEN ${messages.senderType} = 'human' AND ${messages.senderClerkUserId} = ${userId}
            THEN ${messages.recipientClerkUserId}
          WHEN ${messages.senderType} = 'human'
            THEN ${messages.senderClerkUserId}
          WHEN ${messages.senderType} = 'agent'
            THEN ${messages.senderAgentId}::text
        END AS partner_id,
        CASE
          WHEN ${messages.senderType} = 'agent' THEN 'agent'
          ELSE 'human'
        END AS partner_type
      FROM ${messages}
      WHERE ${messages.recipientClerkUserId} = ${userId}
        OR (${messages.senderType} = 'human' AND ${messages.senderClerkUserId} = ${userId})
    )
    SELECT
      p.partner_id,
      p.partner_type,
      (
        SELECT m.content FROM ${messages} m
        WHERE (
          (m.sender_type = 'human' AND m.sender_clerk_user_id = p.partner_id AND m.recipient_clerk_user_id = ${userId})
          OR (m.sender_type = 'human' AND m.sender_clerk_user_id = ${userId} AND m.recipient_clerk_user_id = p.partner_id)
          OR (m.sender_type = 'agent' AND m.sender_agent_id::text = p.partner_id AND m.recipient_clerk_user_id = ${userId})
        )
        ORDER BY m.created_at DESC LIMIT 1
      ) AS last_message,
      (
        SELECT m.created_at FROM ${messages} m
        WHERE (
          (m.sender_type = 'human' AND m.sender_clerk_user_id = p.partner_id AND m.recipient_clerk_user_id = ${userId})
          OR (m.sender_type = 'human' AND m.sender_clerk_user_id = ${userId} AND m.recipient_clerk_user_id = p.partner_id)
          OR (m.sender_type = 'agent' AND m.sender_agent_id::text = p.partner_id AND m.recipient_clerk_user_id = ${userId})
        )
        ORDER BY m.created_at DESC LIMIT 1
      ) AS last_message_at,
      (
        SELECT COUNT(*) FROM ${messages} m
        WHERE m.read = false
          AND m.recipient_clerk_user_id = ${userId}
          AND (
            (m.sender_type = 'human' AND m.sender_clerk_user_id = p.partner_id)
            OR (m.sender_type = 'agent' AND m.sender_agent_id::text = p.partner_id)
          )
      )::int AS unread_count,
      CASE
        WHEN p.partner_type = 'agent' THEN (SELECT a.name FROM ${agents} a WHERE a.id::text = p.partner_id)
        ELSE NULL
      END AS agent_name,
      CASE
        WHEN p.partner_type = 'agent' THEN (SELECT a.display_name FROM ${agents} a WHERE a.id::text = p.partner_id)
        ELSE NULL
      END AS agent_display_name,
      CASE
        WHEN p.partner_type = 'agent' THEN (SELECT a.avatar_url FROM ${agents} a WHERE a.id::text = p.partner_id)
        ELSE NULL
      END AS agent_avatar_url
    FROM partners p
    ORDER BY last_message_at DESC
  `);

  return json({ data: conversations.rows });
}

// POST is handled by /api/messages/send/route.ts
