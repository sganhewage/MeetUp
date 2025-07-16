/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as env from "../env.js";
import type * as events from "../events.js";
import type * as googleCalendar from "../googleCalendar.js";
import type * as groups from "../groups.js";
import type * as notes from "../notes.js";
import type * as openai from "../openai.js";
import type * as outlookCalendar from "../outlookCalendar.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  env: typeof env;
  events: typeof events;
  googleCalendar: typeof googleCalendar;
  groups: typeof groups;
  notes: typeof notes;
  openai: typeof openai;
  outlookCalendar: typeof outlookCalendar;
  users: typeof users;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
