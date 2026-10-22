import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Users live in the Better Auth component. `userId` below is the Better Auth
// user id (string) returned by authComponent.getAuthUser(ctx).

export default defineSchema({
  /* ---------------- learning progress ---------------- */
  progress: defineTable({
    deviceId: v.string(),
    userId: v.optional(v.string()),
    done: v.record(v.string(), v.boolean()),
    challenges: v.record(v.string(), v.boolean()),
    updatedAt: v.number(),
  })
    .index('by_device', ['deviceId'])
    .index('by_user', ['userId']),

  /* ---------------- credits & billing ---------------- */
  wallets: defineTable({
    userId: v.string(),
    credits: v.number(),
    lifetimePurchased: v.number(),
  }).index('by_user', ['userId']),

  ledger: defineTable({
    userId: v.string(),
    delta: v.number(), // + grant/purchase, - usage
    reason: v.union(v.literal('signup'), v.literal('purchase'), v.literal('simplify'), v.literal('generateCourse'), v.literal('refund'), v.literal('admin')),
    ref: v.optional(v.string()), // polar order id, course id, simplification key...
  })
    .index('by_user', ['userId'])
    .index('by_ref', ['ref']),

  /* ---------------- simplify ---------------- */
  simplifications: defineTable({
    key: v.string(), // sha256(level + normalized source text)
    level: v.union(v.literal(1), v.literal(2), v.literal(3)),
    text: v.string(), // simplified markdown-lite
    sourceChars: v.number(),
  }).index('by_key', ['key']),

  /* ---------------- generated courses ---------------- */
  courses: defineTable({
    slug: v.string(),
    ownerId: v.string(),
    topic: v.string(), // what the user typed
    kind: v.union(v.literal('concept'), v.literal('repo')),
    repo: v.optional(v.object({ owner: v.string(), name: v.string(), sha: v.string() })),
    status: v.union(v.literal('queued'), v.literal('planning'), v.literal('writing'), v.literal('ready'), v.literal('failed')),
    visibility: v.union(v.literal('public'), v.literal('unlisted')),
    meta: v.optional(v.any()), // CoursePack minus modules (title, tagline, brand, challenges...) validated by convex/lib/courseSchema.ts
    error: v.optional(v.string()),
    context: v.optional(v.id('_storage')), // repo research (README, files) as JSON, for module writers
    attempts: v.optional(v.number()), // planning attempts
    chargeRef: v.optional(v.string()), // ledger ref of the credit charge, for refunds
    challengesStatus: v.optional(v.union(v.literal('pending'), v.literal('writing'), v.literal('ready'), v.literal('failed'))),
  })
    .index('by_slug', ['slug'])
    .index('by_owner', ['ownerId'])
    .index('by_status_visibility', ['status', 'visibility']),

  courseModules: defineTable({
    courseId: v.id('courses'),
    n: v.number(),
    status: v.union(v.literal('pending'), v.literal('writing'), v.literal('ready'), v.literal('failed')),
    outline: v.any(), // { id, title, kicker, summary, minutes, plan }
    pack: v.optional(v.any()), // ModulePack, validated by courseSchema
    error: v.optional(v.string()),
    attempts: v.optional(v.number()),
  }).index('by_course', ['courseId', 'n']),

  /** Append-only log shown live on the "generating" page. */
  generationEvents: defineTable({
    courseId: v.id('courses'),
    message: v.string(),
    level: v.union(v.literal('info'), v.literal('warn'), v.literal('error')),
  }).index('by_course', ['courseId']),

  /* ---------------- Convex course: Live Lab ---------------- */
  messages: defineTable({ room: v.string(), author: v.string(), body: v.string() }).index('by_room', ['room']),
  counters: defineTable({ name: v.string(), value: v.number() }).index('by_name', ['name']),
});
