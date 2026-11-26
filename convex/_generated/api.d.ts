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
import type * as checks_actions from "../checks/actions.js";
import type * as checks_answerKeys_check from "../checks/answerKeys/check.js";
import type * as checks_answerKeys_examples from "../checks/answerKeys/examples.js";
import type * as checks_answerKeys_prompt from "../checks/answerKeys/prompt.js";
import type * as checks_answerKeys_thresholds from "../checks/answerKeys/thresholds.js";
import type * as checks_codeRuns_check from "../checks/codeRuns/check.js";
import type * as checks_codeRuns_examples from "../checks/codeRuns/examples.js";
import type * as checks_codeRuns_prompt from "../checks/codeRuns/prompt.js";
import type * as checks_codeRuns_thresholds from "../checks/codeRuns/thresholds.js";
import type * as checks_factsCited_check from "../checks/factsCited/check.js";
import type * as checks_factsCited_examples from "../checks/factsCited/examples.js";
import type * as checks_factsCited_prompt from "../checks/factsCited/prompt.js";
import type * as checks_factsCited_thresholds from "../checks/factsCited/thresholds.js";
import type * as checks_jargon_check from "../checks/jargon/check.js";
import type * as checks_jargon_examples from "../checks/jargon/examples.js";
import type * as checks_jargon_prompt from "../checks/jargon/prompt.js";
import type * as checks_jargon_thresholds from "../checks/jargon/thresholds.js";
import type * as checks_linksAndVideos_check from "../checks/linksAndVideos/check.js";
import type * as checks_linksAndVideos_examples from "../checks/linksAndVideos/examples.js";
import type * as checks_linksAndVideos_thresholds from "../checks/linksAndVideos/thresholds.js";
import type * as checks_load_check from "../checks/load/check.js";
import type * as checks_load_examples from "../checks/load/examples.js";
import type * as checks_load_thresholds from "../checks/load/thresholds.js";
import type * as checks_moduleText from "../checks/moduleText.js";
import type * as checks_order_check from "../checks/order/check.js";
import type * as checks_order_examples from "../checks/order/examples.js";
import type * as checks_order_thresholds from "../checks/order/thresholds.js";
import type * as checks_quizQuality_check from "../checks/quizQuality/check.js";
import type * as checks_quizQuality_examples from "../checks/quizQuality/examples.js";
import type * as checks_quizQuality_prompt from "../checks/quizQuality/prompt.js";
import type * as checks_quizQuality_thresholds from "../checks/quizQuality/thresholds.js";
import type * as checks_registry from "../checks/registry.js";
import type * as checks_runner from "../checks/runner.js";
import type * as checks_submissionSchema from "../checks/submissionSchema.js";
import type * as checks_teachingQuality_check from "../checks/teachingQuality/check.js";
import type * as checks_teachingQuality_examples from "../checks/teachingQuality/examples.js";
import type * as checks_teachingQuality_prompt from "../checks/teachingQuality/prompt.js";
import type * as checks_teachingQuality_thresholds from "../checks/teachingQuality/thresholds.js";
import type * as checks_types from "../checks/types.js";
import type * as checks_validators from "../checks/validators.js";
import type * as courseBuilds from "../courseBuilds.js";
import type * as courseModuleRuns from "../courseModuleRuns.js";
import type * as coursePublish from "../coursePublish.js";
import type * as courseRequests from "../courseRequests.js";
import type * as courses from "../courses.js";
import type * as crons from "../crons.js";
import type * as desktopSignIn from "../desktopSignIn.js";
import type * as finder_actions from "../finder/actions.js";
import type * as finder_articles from "../finder/articles.js";
import type * as finder_blocks from "../finder/blocks.js";
import type * as finder_cache from "../finder/cache.js";
import type * as finder_chapters from "../finder/chapters.js";
import type * as finder_concepts from "../finder/concepts.js";
import type * as finder_picks from "../finder/picks.js";
import type * as finder_rubric from "../finder/rubric.js";
import type * as finder_scoring from "../finder/scoring.js";
import type * as finder_types from "../finder/types.js";
import type * as finder_validators from "../finder/validators.js";
import type * as finder_videoSearch from "../finder/videoSearch.js";
import type * as finder_weights from "../finder/weights.js";
import type * as finder_youtubeCalls from "../finder/youtubeCalls.js";
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
import type * as lib_brand from "../lib/brand.js";
import type * as lib_brandContrast from "../lib/brandContrast.js";
import type * as lib_conceptMapLint from "../lib/conceptMapLint.js";
import type * as lib_conceptMapSchema from "../lib/conceptMapSchema.js";
import type * as lib_courseDocuments from "../lib/courseDocuments.js";
import type * as lib_courseRequests from "../lib/courseRequests.js";
import type * as lib_courseSchema from "../lib/courseSchema.js";
import type * as lib_desktopPairing from "../lib/desktopPairing.js";
import type * as lib_fixtures_pythonGenerators from "../lib/fixtures/pythonGenerators.js";
import type * as lib_fixtures_pythonGeneratorsMap from "../lib/fixtures/pythonGeneratorsMap.js";
import type * as lib_fixtures_pythonGeneratorsModules from "../lib/fixtures/pythonGeneratorsModules.js";
import type * as lib_lessonLint from "../lib/lessonLint.js";
import type * as lib_mastery from "../lib/mastery.js";
import type * as lib_model from "../lib/model.js";
import type * as lib_polarWebhook from "../lib/polarWebhook.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_slug from "../lib/slug.js";
import type * as lib_types from "../lib/types.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_webFetch from "../lib/webFetch.js";
import type * as lib_youtube from "../lib/youtube.js";
import type * as lib_youtubeSchema from "../lib/youtubeSchema.js";
import type * as mastery from "../mastery.js";
import type * as mcp_checkReport from "../mcp/checkReport.js";
import type * as mcp_endpoint from "../mcp/endpoint.js";
import type * as mcp_engineState from "../mcp/engineState.js";
import type * as mcp_engineText from "../mcp/engineText.js";
import type * as mcp_finderTools from "../mcp/finderTools.js";
import type * as mcp_format from "../mcp/format.js";
import type * as mcp_moduleBrief from "../mcp/moduleBrief.js";
import type * as mcp_moduleTools from "../mcp/moduleTools.js";
import type * as mcp_publishTools from "../mcp/publishTools.js";
import type * as mcp_researchTools from "../mcp/researchTools.js";
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
  "checks/actions": typeof checks_actions;
  "checks/answerKeys/check": typeof checks_answerKeys_check;
  "checks/answerKeys/examples": typeof checks_answerKeys_examples;
  "checks/answerKeys/prompt": typeof checks_answerKeys_prompt;
  "checks/answerKeys/thresholds": typeof checks_answerKeys_thresholds;
  "checks/codeRuns/check": typeof checks_codeRuns_check;
  "checks/codeRuns/examples": typeof checks_codeRuns_examples;
  "checks/codeRuns/prompt": typeof checks_codeRuns_prompt;
  "checks/codeRuns/thresholds": typeof checks_codeRuns_thresholds;
  "checks/factsCited/check": typeof checks_factsCited_check;
  "checks/factsCited/examples": typeof checks_factsCited_examples;
  "checks/factsCited/prompt": typeof checks_factsCited_prompt;
  "checks/factsCited/thresholds": typeof checks_factsCited_thresholds;
  "checks/jargon/check": typeof checks_jargon_check;
  "checks/jargon/examples": typeof checks_jargon_examples;
  "checks/jargon/prompt": typeof checks_jargon_prompt;
  "checks/jargon/thresholds": typeof checks_jargon_thresholds;
  "checks/linksAndVideos/check": typeof checks_linksAndVideos_check;
  "checks/linksAndVideos/examples": typeof checks_linksAndVideos_examples;
  "checks/linksAndVideos/thresholds": typeof checks_linksAndVideos_thresholds;
  "checks/load/check": typeof checks_load_check;
  "checks/load/examples": typeof checks_load_examples;
  "checks/load/thresholds": typeof checks_load_thresholds;
  "checks/moduleText": typeof checks_moduleText;
  "checks/order/check": typeof checks_order_check;
  "checks/order/examples": typeof checks_order_examples;
  "checks/order/thresholds": typeof checks_order_thresholds;
  "checks/quizQuality/check": typeof checks_quizQuality_check;
  "checks/quizQuality/examples": typeof checks_quizQuality_examples;
  "checks/quizQuality/prompt": typeof checks_quizQuality_prompt;
  "checks/quizQuality/thresholds": typeof checks_quizQuality_thresholds;
  "checks/registry": typeof checks_registry;
  "checks/runner": typeof checks_runner;
  "checks/submissionSchema": typeof checks_submissionSchema;
  "checks/teachingQuality/check": typeof checks_teachingQuality_check;
  "checks/teachingQuality/examples": typeof checks_teachingQuality_examples;
  "checks/teachingQuality/prompt": typeof checks_teachingQuality_prompt;
  "checks/teachingQuality/thresholds": typeof checks_teachingQuality_thresholds;
  "checks/types": typeof checks_types;
  "checks/validators": typeof checks_validators;
  courseBuilds: typeof courseBuilds;
  courseModuleRuns: typeof courseModuleRuns;
  coursePublish: typeof coursePublish;
  courseRequests: typeof courseRequests;
  courses: typeof courses;
  crons: typeof crons;
  desktopSignIn: typeof desktopSignIn;
  "finder/actions": typeof finder_actions;
  "finder/articles": typeof finder_articles;
  "finder/blocks": typeof finder_blocks;
  "finder/cache": typeof finder_cache;
  "finder/chapters": typeof finder_chapters;
  "finder/concepts": typeof finder_concepts;
  "finder/picks": typeof finder_picks;
  "finder/rubric": typeof finder_rubric;
  "finder/scoring": typeof finder_scoring;
  "finder/types": typeof finder_types;
  "finder/validators": typeof finder_validators;
  "finder/videoSearch": typeof finder_videoSearch;
  "finder/weights": typeof finder_weights;
  "finder/youtubeCalls": typeof finder_youtubeCalls;
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
  "lib/brand": typeof lib_brand;
  "lib/brandContrast": typeof lib_brandContrast;
  "lib/conceptMapLint": typeof lib_conceptMapLint;
  "lib/conceptMapSchema": typeof lib_conceptMapSchema;
  "lib/courseDocuments": typeof lib_courseDocuments;
  "lib/courseRequests": typeof lib_courseRequests;
  "lib/courseSchema": typeof lib_courseSchema;
  "lib/desktopPairing": typeof lib_desktopPairing;
  "lib/fixtures/pythonGenerators": typeof lib_fixtures_pythonGenerators;
  "lib/fixtures/pythonGeneratorsMap": typeof lib_fixtures_pythonGeneratorsMap;
  "lib/fixtures/pythonGeneratorsModules": typeof lib_fixtures_pythonGeneratorsModules;
  "lib/lessonLint": typeof lib_lessonLint;
  "lib/mastery": typeof lib_mastery;
  "lib/model": typeof lib_model;
  "lib/polarWebhook": typeof lib_polarWebhook;
  "lib/pricing": typeof lib_pricing;
  "lib/slug": typeof lib_slug;
  "lib/types": typeof lib_types;
  "lib/validators": typeof lib_validators;
  "lib/webFetch": typeof lib_webFetch;
  "lib/youtube": typeof lib_youtube;
  "lib/youtubeSchema": typeof lib_youtubeSchema;
  mastery: typeof mastery;
  "mcp/checkReport": typeof mcp_checkReport;
  "mcp/endpoint": typeof mcp_endpoint;
  "mcp/engineState": typeof mcp_engineState;
  "mcp/engineText": typeof mcp_engineText;
  "mcp/finderTools": typeof mcp_finderTools;
  "mcp/format": typeof mcp_format;
  "mcp/moduleBrief": typeof mcp_moduleBrief;
  "mcp/moduleTools": typeof mcp_moduleTools;
  "mcp/publishTools": typeof mcp_publishTools;
  "mcp/researchTools": typeof mcp_researchTools;
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
