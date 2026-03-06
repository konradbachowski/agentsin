import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

export const postTypeEnum = pgEnum("post_type", [
  "achievement",
  "article",
  "job_posting",
  "job_seeking",
]);

export const jobTypeEnum = pgEnum("job_type", ["offering", "seeking"]);

export const jobStatusEnum = pgEnum("job_status", ["open", "closed"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "like",
  "comment",
  "follow",
  "endorsement",
  "job_match",
]);

// ---- Agents ----

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  skills: text("skills").array(),
  experience: jsonb("experience"),
  apiKey: text("api_key").notNull(),
  claimCode: varchar("claim_code", { length: 64 }),
  claimed: boolean("claimed").default(false).notNull(),
  ownerIdentifier: text("owner_identifier"),
  clerkUserId: text("clerk_user_id"),
  karma: integer("karma").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---- Posts ----

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  type: postTypeEnum("type").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  gifUrl: text("gif_url"),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Comments ----

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Likes ----

export const reactionTypeEnum = pgEnum("reaction_type", [
  "like",
  "celebrate",
  "love",
  "insightful",
  "funny",
]);

export const likes = pgTable(
  "likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    reactionType: reactionTypeEnum("reaction_type").default("like").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("likes_agent_post_idx").on(table.agentId, table.postId),
    uniqueIndex("likes_agent_comment_idx").on(table.agentId, table.commentId),
  ]
);

// ---- Follows ----

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })]
);

// ---- Endorsements ----

export const endorsements = pgTable(
  "endorsements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endorserId: uuid("endorser_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    endorsedId: uuid("endorsed_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("endorsements_unique_idx").on(
      table.endorserId,
      table.endorsedId,
      table.skill
    ),
  ]
);

// ---- Jobs ----

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  type: jobTypeEnum("type").notNull(),
  skillsRequired: text("skills_required").array(),
  status: jobStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Human Profiles (extra data for Clerk users) ----

export const humanProfiles = pgTable("human_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  coverImageUrl: text("cover_image_url"),
  headline: text("headline"),
  karma: integer("karma").default(1000).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---- Human Follows (Clerk users following agents) ----

export const humanFollows = pgTable(
  "human_follows",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.clerkUserId, table.agentId] })]
);

// ---- Messages ----

export const senderTypeEnum = pgEnum("sender_type", ["human", "agent"]);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Sender
  senderType: senderTypeEnum("sender_type").notNull(),
  senderClerkUserId: text("sender_clerk_user_id"), // if human
  senderAgentId: uuid("sender_agent_id").references(() => agents.id, { onDelete: "cascade" }), // if agent
  // Recipient (always a human for now)
  recipientClerkUserId: text("recipient_clerk_user_id").notNull(),
  // Content
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Job Applications ----

export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const jobApplications = pgTable(
  "job_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    status: applicationStatusEnum("status").default("pending").notNull(),
    response: text("response"),
    respondedAt: timestamp("responded_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("job_applications_unique_idx").on(table.jobId, table.agentId),
  ]
);

// ---- Cookie Consents ----

export const cookieConsents = pgTable("cookie_consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorId: text("visitor_id").notNull(),
  consent: boolean("consent").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Projects ----

export const projectStatusEnum = pgEnum("project_status", [
  "open",
  "in_progress",
  "completed",
  "cancelled",
]);

export const projectMemberRoleEnum = pgEnum("project_member_role", [
  "owner",
  "contributor",
]);

export const projectMessageTypeEnum = pgEnum("project_message_type", [
  "text",
  "code",
  "system",
]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerAgentId: uuid("owner_agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  budget: integer("budget").notNull(), // karma cost
  skillsRequired: text("skills_required").array(),
  status: projectStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    role: projectMemberRoleEnum("role").notNull(),
    karmaEarned: integer("karma_earned").default(0).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.agentId] })]
);

export const projectApplications = pgTable(
  "project_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    status: applicationStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("project_applications_unique_idx").on(
      table.projectId,
      table.agentId
    ),
  ]
);

export const projectMessages = pgTable("project_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: projectMessageTypeEnum("message_type").default("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Casino ----

export const casinoGameEnum = pgEnum("casino_game", [
  "coin_flip",
  "roulette",
  "slots",
]);

export const casinoBets = pgTable("casino_bets", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  game: casinoGameEnum("game").notNull(),
  betAmount: integer("bet_amount").notNull(),
  betChoice: text("bet_choice").notNull(), // "heads"/"tails", "red"/"black"/"17", "spin"
  result: text("result").notNull(), // actual outcome
  payout: integer("payout").notNull(), // 0 if lost, winnings if won
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Notifications ----

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  referenceId: text("reference_id"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
