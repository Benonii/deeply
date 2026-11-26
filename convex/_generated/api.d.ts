/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentKeys from "../agentKeys.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as courseRequests from "../courseRequests.js";
import type * as courses from "../courses.js";
import type * as crons from "../crons.js";
import type * as desktopSignIn from "../desktopSignIn.js";
import type * as generate_actions from "../generate/actions.js";
import type * as generate_fake from "../generate/fake.js";
import type * as generate_github from "../generate/github.js";
import type * as generate_llm from "../generate/llm.js";
import type * as generate_prompts from "../generate/prompts.js";
import type * as generate_shapes from "../generate/shapes.js";
import type * as generate_state from "../generate/state.js";
import type * as http from "../http.js";
import type * as lab from "../lab.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_agentKeys from "../lib/agentKeys.js";
import type * as lib_brandContrast from "../lib/brandContrast.js";
import type * as lib_conceptMapLint from "../lib/conceptMapLint.js";
import type * as lib_conceptMapSchema from "../lib/conceptMapSchema.js";
import type * as lib_courseRequests from "../lib/courseRequests.js";
import type * as lib_courseSchema from "../lib/courseSchema.js";
import type * as lib_desktopPairing from "../lib/desktopPairing.js";
import type * as lib_fixtures_pythonGenerators from "../lib/fixtures/pythonGenerators.js";
import type * as lib_fixtures_pythonGeneratorsMap from "../lib/fixtures/pythonGeneratorsMap.js";
import type * as lib_fixtures_pythonGeneratorsModules from "../lib/fixtures/pythonGeneratorsModules.js";
import type * as lib_lessonLint from "../lib/lessonLint.js";
import type * as lib_model from "../lib/model.js";
import type * as lib_polarWebhook from "../lib/polarWebhook.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_types from "../lib/types.js";
import type * as mcp_endpoint from "../mcp/endpoint.js";
import type * as mcp_format from "../mcp/format.js";
import type * as mcp_server from "../mcp/server.js";
import type * as mcp_tools from "../mcp/tools.js";
import type * as mcp_types from "../mcp/types.js";
import type * as mcp_validators from "../mcp/validators.js";
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
  agentKeys: typeof agentKeys;
  auth: typeof auth;
  billing: typeof billing;
  courseRequests: typeof courseRequests;
  courses: typeof courses;
  crons: typeof crons;
  desktopSignIn: typeof desktopSignIn;
  "generate/actions": typeof generate_actions;
  "generate/fake": typeof generate_fake;
  "generate/github": typeof generate_github;
  "generate/llm": typeof generate_llm;
  "generate/prompts": typeof generate_prompts;
  "generate/shapes": typeof generate_shapes;
  "generate/state": typeof generate_state;
  http: typeof http;
  lab: typeof lab;
  "lib/admin": typeof lib_admin;
  "lib/agentKeys": typeof lib_agentKeys;
  "lib/brandContrast": typeof lib_brandContrast;
  "lib/conceptMapLint": typeof lib_conceptMapLint;
  "lib/conceptMapSchema": typeof lib_conceptMapSchema;
  "lib/courseRequests": typeof lib_courseRequests;
  "lib/courseSchema": typeof lib_courseSchema;
  "lib/desktopPairing": typeof lib_desktopPairing;
  "lib/fixtures/pythonGenerators": typeof lib_fixtures_pythonGenerators;
  "lib/fixtures/pythonGeneratorsMap": typeof lib_fixtures_pythonGeneratorsMap;
  "lib/fixtures/pythonGeneratorsModules": typeof lib_fixtures_pythonGeneratorsModules;
  "lib/lessonLint": typeof lib_lessonLint;
  "lib/model": typeof lib_model;
  "lib/polarWebhook": typeof lib_polarWebhook;
  "lib/pricing": typeof lib_pricing;
  "lib/types": typeof lib_types;
  "mcp/endpoint": typeof mcp_endpoint;
  "mcp/format": typeof mcp_format;
  "mcp/server": typeof mcp_server;
  "mcp/tools": typeof mcp_tools;
  "mcp/types": typeof mcp_types;
  "mcp/validators": typeof mcp_validators;
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
