import { Polar } from '@convex-dev/polar';
import { v } from 'convex/values';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { action, internalAction, query } from './_generated/server';
import { authComponent, currentUser } from './auth';
import { rateLimiter } from './rateLimits';

export const DEFAULT_PACK_CREDITS = { small: 200, large: 1000 } as const;
type PackKey = keyof typeof DEFAULT_PACK_CREDITS;

const productIds = {
  small: process.env.POLAR_PRODUCT_CREDITS_SMALL ?? '',
  large: process.env.POLAR_PRODUCT_CREDITS_LARGE ?? ''
};

export const polar = new Polar<DataModel, typeof productIds>(components.polar, {
  getUserInfo: async (context) => {
    const user = await authComponent.getAuthUser(context as Parameters<typeof authComponent.getAuthUser>[0]);
    return { userId: user._id, email: user.email };
  },
  products: productIds
});

function packForProduct(productId: string | null | undefined): PackKey | null {
  if (!productId) return null;
  for (const packKey of Object.keys(productIds) as PackKey[])
    if (productIds[packKey] && productIds[packKey] === productId) return packKey;
  return null;
}

export const packs = query({
  args: {},
  handler: async (context) => {
    const all = await polar.listProducts(context);
    const configured = Object.fromEntries(
      (Object.keys(productIds) as PackKey[]).map((packKey) => [
        packKey,
        all.find((product) => productIds[packKey] && product.id === productIds[packKey])
      ])
    ) as Record<PackKey, (typeof all)[number] | undefined>;
    const out: { key: PackKey; name: string; credits: number; priceCents: number | null; currency: string }[] = [];
    for (const key of Object.keys(DEFAULT_PACK_CREDITS) as PackKey[]) {
      const configuredProduct = configured[key];
      if (!configuredProduct) continue;
      const price = configuredProduct.prices[0];
      const meta = (configuredProduct as { metadata?: Record<string, unknown> }).metadata;
      const credits = Number(meta?.credits) || DEFAULT_PACK_CREDITS[key];
      out.push({
        key,
        name: configuredProduct.name,
        credits,
        priceCents: price && 'priceAmount' in price ? (price.priceAmount ?? null) : null,
        currency: (price && 'priceCurrency' in price ? price.priceCurrency : undefined) ?? 'usd'
      });
    }
    return out;
  }
});

export const checkout = action({
  args: { pack: v.union(v.literal('small'), v.literal('large')), returnUrl: v.string() },
  handler: async (context, { pack, returnUrl }): Promise<{ url: string } | { error: string }> => {
    const user = await currentUser(context);
    if (!user) return { error: 'Sign in to buy credits.' };
    const productId = productIds[pack];
    if (!productId) return { error: 'Credit packs are not configured yet.' };
    const limit = await rateLimiter.limit(context, 'checkout', { key: user._id });
    if (!limit.ok) return { error: 'Too many checkout attempts. Try again in a few minutes.' };
    const site = process.env.SITE_URL ?? new URL(returnUrl).origin;
    const success = returnUrl.startsWith(site) ? returnUrl : `${site}/#/account?purchase=success`;
    try {
      const session = await polar.createCheckoutSession(context, {
        productIds: [productId],
        userId: user._id,
        email: user.email,
        origin: site,
        successUrl: success,
        metadata: { userId: user._id, pack }
      });
      return { url: session.url };
    } catch (error) {
      console.error('Polar checkout failed', error);
      return { error: 'Checkout is unavailable right now. Try again shortly.' };
    }
  }
});

export const syncProducts = internalAction({
  args: {},
  handler: async (context) => {
    await polar.syncProducts(context);
  }
});

export async function creditsForOrder(order: {
  productId: string | null;
  metadata?: { [metadataKey: string]: unknown };
  customer?: { metadata?: { [metadataKey: string]: unknown }; externalId?: string | null };
}) {
  const userId =
    (order.metadata?.userId as string | undefined) ??
    (order.customer?.metadata?.userId as string | undefined) ??
    order.customer?.externalId ??
    null;
  const pack = packForProduct(order.productId) ?? (order.metadata?.pack as PackKey | undefined) ?? null;
  const credits = pack ? DEFAULT_PACK_CREDITS[pack] : 0;
  return { userId, pack, credits };
}
