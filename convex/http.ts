import { type HttpRouter, httpRouter, type PublicHttpAction } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { authComponent, createAuth } from './auth';
import { creditsForOrder, polar } from './billing';
import { resignPolarWebhook } from './lib/polarWebhook';

import type { HttpActionInternals } from './lib/types';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

let polarHandler: PublicHttpAction | undefined;
const capturePolarRoute = {
  route: ({ handler }: { handler: PublicHttpAction }) => {
    polarHandler = handler;
  }
} as unknown as HttpRouter;

polar.registerRoutes(capturePolarRoute, {
  events: {
    'order.paid': async (context, event) => {
      const { userId, credits } = await creditsForOrder(event.data);
      if (!userId || credits <= 0) {
        console.error('order.paid without a resolvable user or pack', event.data.id);
        return;
      }
      await context.runMutation(internal.wallet.credit, { userId, credits, ref: `polar:${event.data.id}` });
    }
  }
});

const handlePolarEvent = (polarHandler as unknown as HttpActionInternals)._handler;

http.route({
  path: '/polar/events',
  method: 'POST',
  handler: httpAction(async (context, request) => {
    const verifiedRequest = await resignPolarWebhook(request, process.env.POLAR_WEBHOOK_SECRET ?? '');
    if (!verifiedRequest) {
      console.error('Polar webhook rejected: signature did not match POLAR_WEBHOOK_SECRET');
      return new Response('Forbidden', { status: 403 });
    }
    return handlePolarEvent(context, verifiedRequest);
  })
});

export default http;
