import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();
crons.hourly('prune lab messages', { minuteUTC: 7 }, internal.lab.pruneMessages, {});
crons.hourly('prune expired desktop sign-ins', { minuteUTC: 17 }, internal.desktopSignIn.pruneExpired, {});
export default crons;
