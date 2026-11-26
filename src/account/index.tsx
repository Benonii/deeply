import { useConvexAuth, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Link } from '@farm.js/core/client';
import { useConvexClient } from '../platform/convexClient';
import { FREE_COURSES_TEXT } from '../../convex/lib/pricing';
import { requestSignIn } from './host';
import './account.css';

import type { AccountProfile } from '../types';

const api = anyApi;

export function openSignIn(reason?: string) {
  requestSignIn({ reason });
}

export function useCredits(): number | null | undefined {
  const client = useConvexClient();
  if (!client) return null;
  const me = useQuery(api.wallet.me) as AccountProfile | null | undefined;
  return me === undefined ? undefined : me ? readCredits(me) : null;
}

export function readCredits(me: AccountProfile): number {
  return me.isUnlimited ? Number.POSITIVE_INFINITY : me.credits;
}

export function formatCredits(credits: number): string {
  return Number.isFinite(credits) ? String(credits) : 'Unlimited';
}

export function AccountButton() {
  const client = useConvexClient();
  if (!client) return null;
  return <AccountButtonInner />;
}

function AccountButtonInner() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.wallet.me) as AccountProfile | null | undefined;
  if (isLoading)
    return (
      <div className="acc-btn acc-btn-ghost" aria-busy="true">
        …
      </div>
    );
  if (!isAuthenticated || !me) {
    return (
      <button className="acc-btn" onClick={() => openSignIn()}>
        Sign in <span className="acc-btn-hint">{FREE_COURSES_TEXT}</span>
      </button>
    );
  }
  return (
    <Link className="acc-btn acc-btn-user" href="/account" title="Account and credits">
      <Avatar me={me} />
      <span className="acc-btn-name">{me.name || me.email}</span>
      <span className={`acc-pill ${readCredits(me) <= 5 ? 'low' : ''}`}>{formatCredits(readCredits(me))} cr</span>
    </Link>
  );
}

export function Avatar({ me, size = 24 }: { me: Pick<AccountProfile, 'image' | 'name' | 'email'>; size?: number }) {
  const initial = (me.name || me.email || '?').trim().charAt(0).toUpperCase();
  return me.image ? (
    <img className="acc-avatar" src={me.image} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="acc-avatar acc-avatar-initial" style={{ width: size, height: size }}>
      {initial}
    </span>
  );
}
