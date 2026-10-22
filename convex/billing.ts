import { Polar } from '@convex-dev/polar';
import { v } from 'convex/values';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { action, internalAction, query } from './_generated/server';
import { authComponent, currentUser } from './auth';
import { rateLimiter } from './rateLimits';

/**
 * Credit packs are one-time Polar products. Set their ids in Convex env:
 *   POLAR_PRODUCT_CREDITS_SMALL, POLAR_PRODUCT_CREDITS_LARGE
 * Credits per pack come from the product's `credits` metadata in Polar when
 * present, otherwise from DEFAULT_PACK_CREDITS.
 */
export const DEFAULT_PACK_CREDITS = { small: 200, large: 1000 } as const;
type PackKey = keyof typeof DEFAULT_PACK_CREDITS;

const productIds = {
  small: process.env.POLAR_PRODUCT_CREDITS_SMALL ?? '',
  large: process.env.POLAR_PRODUCT_CREDITS_LARGE ?? '',
};

export const polar = new Polar<DataModel, typeof productIds>(components.polar, {
  getUserInfo: async (ctx) => {
    // The component passes a query/action ctx; Better Auth accepts any Convex ctx.
    const user = await authComponent.getAuthUser(ctx as Parameters<typeof authComponent.getAuthUser>[0]);
    return { userId: user._id, email: user.email };
  },
  products: productIds,
});

function packForProduct(productId: string | null | undefined): PackKey | null {
  if (!productId) return null;
  for (const k of Object.keys(productIds) as PackKey[]) if (productIds[k] && productIds[k] === productId) return k;
  return null;
}

/** Packs for the pricing UI: name, price, credits. Empty when Polar isn't configured. */
export const packs = query({
  args: {},
  handler: async (ctx) => {
    const all = await polar.listProducts(ctx);
    const configured = Object.fromEntries(
      (Object.keys(productIds) as PackKey[]).map((k) => [k, all.find((p) => productIds[k] && p.id === productIds[k])]),
    ) as Record<PackKey, (typeof all)[number] | undefined>;
    const out: { key: PackKey; name: string; credits: number; priceCents: number | null; currency: string }[] = [];
    for (const key of Object.keys(DEFAULT_PACK_CREDITS) as PackKey[]) {
      const p = configured[key];
      if (!p) continue;
      const price = p.prices[0];
      const meta = (p as { metadata?: Record<string, unknown> }).metadata;
      const credits = Number(meta?.credits) || DEFAULT_PACK_CREDITS[key];
      out.push({
        key,
        name: p.name,
        credits,
        priceCents: price && 'priceAmount' in price ? (price.priceAmount ?? null) : null,
        currency: (price && 'priceCurrency' in price ? price.priceCurrency : undefined) ?? 'usd',
      });
    }
    return out;
  },
});

/** Creates a Polar checkout for a credit pack and returns its URL. */
export const checkout = action({
  args: { pack: v.union(v.literal('small'), v.literal('large')), returnUrl: v.string() },
  handler: async (ctx, { pack, returnUrl }): Promise<{ url: string } | { error: string }> => {
    const user = await currentUser(ctx);
    if (!user) return { error: 'Sign in to buy credits.' };
    const productId = productIds[pack];
    if (!productId) return { error: 'Credit packs are not configured yet.' };
    const limit = await rateLimiter.limit(ctx, 'checkout', { key: user._id });
    if (!limit.ok) return { error: 'Too many checkout attempts. Try again in a few minutes.' };
    const site = process.env.SITE_URL ?? new URL(returnUrl).origin;
    // Only redirect back to our own site.
    const success = returnUrl.startsWith(site) ? returnUrl : `${site}/#/account?purchase=success`;
    try {
      const session = await polar.createCheckoutSession(ctx, {
        productIds: [productId],
        userId: user._id,
        email: user.email,
        origin: site,
        successUrl: success,
        metadata: { userId: user._id, pack },
      });
      return { url: session.url };
    } catch (err) {
      console.error('Polar checkout failed', err);
      return { error: 'Checkout is unavailable right now. Try again shortly.' };
    }
  },
});

/** One-off: pull products created in Polar before the webhook existed. */
export const syncProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});

/** Resolve who paid and how many credits an order is worth. Exported for the webhook. */
export async function creditsForOrder(order: {
  productId: string | null;
  metadata?: { [k: string]: unknown };
  customer?: { metadata?: { [k: string]: unknown }; externalId?: string | null };
}) {
  const userId =
    (order.metadata?.userId as string | undefined) ??
    (order.customer?.metadata?.userId as string | undefined) ??
    order.customer?.externalId ??
    null;
  const pack = packForProduct(order.productId) ?? ((order.metadata?.pack as PackKey | undefined) ?? null);
  const credits = pack ? DEFAULT_PACK_CREDITS[pack] : 0;
  return { userId, pack, credits };
}

