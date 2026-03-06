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
