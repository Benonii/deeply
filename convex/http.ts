import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { authComponent, createAuth } from './auth';
import { creditsForOrder, polar } from './billing';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

polar.registerRoutes(http, {
  events: {
    'order.paid': async (context, event) => {
      const { userId, credits } = await creditsForOrder(event.data);
      if (!userId || credits <= 0) {
        console.error('order.paid without a resolvable user or pack', event.data.id);
        return;
      }
      await context.runMutation(internal.wallet.credit, { userId, credits, ref: `polar:${event.data.id}` });
    },
  },
});

export default http;
