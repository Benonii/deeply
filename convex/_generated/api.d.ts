/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as courses from "../courses.js";
import type * as crons from "../crons.js";
import type * as generate_actions from "../generate/actions.js";
import type * as generate_fake from "../generate/fake.js";
import type * as generate_github from "../generate/github.js";
import type * as generate_llm from "../generate/llm.js";
import type * as generate_prompts from "../generate/prompts.js";
import type * as generate_shapes from "../generate/shapes.js";
import type * as generate_state from "../generate/state.js";
import type * as http from "../http.js";
import type * as lab from "../lab.js";
import type * as lib_courseSchema from "../lib/courseSchema.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as progress from "../progress.js";
import type * as rateLimits from "../rateLimits.js";
import type * as simplify from "../simplify.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  billing: typeof billing;
  courses: typeof courses;
  crons: typeof crons;
  "generate/actions": typeof generate_actions;
  "generate/fake": typeof generate_fake;
  "generate/github": typeof generate_github;
  "generate/llm": typeof generate_llm;
  "generate/prompts": typeof generate_prompts;
  "generate/shapes": typeof generate_shapes;
  "generate/state": typeof generate_state;
  http: typeof http;
  lab: typeof lab;
  "lib/courseSchema": typeof lib_courseSchema;
  "lib/pricing": typeof lib_pricing;
  progress: typeof progress;
  rateLimits: typeof rateLimits;
  simplify: typeof simplify;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
