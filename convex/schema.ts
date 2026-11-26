import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { courseRequestOrigin, courseRequestStage, courseRequestStatus } from './lib/courseRequests';

export default defineSchema({
  progress: defineTable({
    deviceId: v.string(),
    userId: v.optional(v.string()),
    done: v.record(v.string(), v.boolean()),
    challenges: v.record(v.string(), v.boolean()),
    updatedAt: v.number()
  })
    .index('by_device', ['deviceId'])
    .index('by_user', ['userId']),

  wallets: defineTable({
    userId: v.string(),
    credits: v.number(),
    lifetimePurchased: v.number()
  }).index('by_user', ['userId']),

  ledger: defineTable({
    userId: v.string(),
    delta: v.number(),
    reason: v.union(
      v.literal('signup'),
      v.literal('purchase'),
      v.literal('simplify'),
      v.literal('generateCourse'),
      v.literal('refund'),
      v.literal('admin')
    ),
    ref: v.optional(v.string())
  })
    .index('by_user', ['userId'])
    .index('by_ref', ['ref']),

  simplifications: defineTable({
    key: v.string(),
    level: v.union(v.literal(1), v.literal(2), v.literal(3)),
    text: v.string(),
    sourceChars: v.number()
  }).index('by_key', ['key']),

  courses: defineTable({
    slug: v.string(),
    ownerId: v.string(),
    topic: v.string(),
    kind: v.union(v.literal('concept'), v.literal('repo')),
    repo: v.optional(v.object({ owner: v.string(), name: v.string(), sha: v.string() })),
    status: v.union(
      v.literal('queued'),
      v.literal('planning'),
      v.literal('writing'),
      v.literal('ready'),
      v.literal('failed')
    ),
    visibility: v.union(v.literal('public'), v.literal('unlisted')),
    meta: v.optional(v.any()),
    error: v.optional(v.string()),
    context: v.optional(v.id('_storage')),
    attempts: v.optional(v.number()),
    chargeRef: v.optional(v.string()),
    challengesStatus: v.optional(
      v.union(v.literal('pending'), v.literal('writing'), v.literal('ready'), v.literal('failed'))
    )
  })
    .index('by_slug', ['slug'])
    .index('by_owner', ['ownerId'])
    .index('by_status_visibility', ['status', 'visibility']),

  courseRequests: defineTable({
    ownerId: v.string(),
    topic: v.string(),
    goal: v.optional(v.string()),
    status: courseRequestStatus,
    stepsDone: v.array(courseRequestStage),
    courseId: v.optional(v.id('courses')),
    origin: courseRequestOrigin,
    error: v.optional(v.string()),
    updatedAt: v.number()
  }).index('by_owner', ['ownerId']),

  agentKeys: defineTable({
    userId: v.string(),
    name: v.string(),
    prefix: v.string(),
    secretHash: v.string(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number())
  })
    .index('by_hash', ['secretHash'])
    .index('by_user', ['userId']),

  courseModules: defineTable({
    courseId: v.id('courses'),
    n: v.number(),
    status: v.union(v.literal('pending'), v.literal('writing'), v.literal('ready'), v.literal('failed')),
    outline: v.any(),
    pack: v.optional(v.any()),
    error: v.optional(v.string()),
    attempts: v.optional(v.number())
  }).index('by_course', ['courseId', 'n']),

  generationEvents: defineTable({
    courseId: v.id('courses'),
    message: v.string(),
    level: v.union(v.literal('info'), v.literal('warn'), v.literal('error'))
  }).index('by_course', ['courseId']),

  desktopPairings: defineTable({
    pairingHash: v.string(),
    oneTimeToken: v.string(),
    expiresAt: v.number()
  })
    .index('by_hash', ['pairingHash'])
    .index('by_expiry', ['expiresAt']),

  conceptMedia: defineTable({
    conceptKey: v.string(),
    topic: v.string(),
    conceptName: v.string(),
    conceptId: v.string(),
    videoCandidates: v.optional(v.any()),
    articleCandidates: v.optional(v.any()),
    videos: v.optional(v.any()),
    articles: v.optional(v.any()),
    fetchedAt: v.number(),
    quotaUnits: v.number()
  }).index('by_concept_key', ['conceptKey']),

  finderQuota: defineTable({
    day: v.string(),
    conceptKey: v.string(),
    call: v.union(v.literal('search'), v.literal('videos'), v.literal('commentThreads'), v.literal('channels')),
    calls: v.number(),
    units: v.number()
  }).index('by_day', ['day']),

  messages: defineTable({ room: v.string(), author: v.string(), body: v.string() }).index('by_room', ['room']),
  counters: defineTable({ name: v.string(), value: v.number() }).index('by_name', ['name'])
});
