import { useState } from 'react';
import { useAction, useConvexAuth, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { platform } from '@farm.js/core/platform';
import { getAuthClient } from '../lib/authClient';
import { PRODUCTION_WEB_URL } from '../lib/deployment';
import { useConvexClient } from '../platform/convexClient';
import { countCourses } from '../../convex/lib/pricing';
import { AgentKeys } from './AgentKeys';
import { Avatar, formatCredits, openSignIn, readCredits } from './index';

import type { AccountProfile, CreditLedgerRow, CreditPack } from '../types';

const api = anyApi;

export function AccountPage() {
  const client = useConvexClient();
  if (!client) {
    return (
      <div className="acc-page">
        <header className="acc-head">
          <h1>Account</h1>
        </header>
        <p className="acc-muted">Accounts need a Convex backend. This build isn't connected to one.</p>
      </div>
    );
  }
  return <AccountPageInner />;
}

const REASON_LABEL: Record<string, string> = {
  signup: 'Welcome credits',
  purchase: 'Credits purchased',
  simplify: 'Simplify',
  generateCourse: 'Course generated',
  refund: 'Refund',
  admin: 'Adjustment'
};

function AccountPageInner() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.wallet.me) as AccountProfile | null | undefined;
  const history = useQuery(api.wallet.history) as CreditLedgerRow[] | undefined;
  const packs = useQuery(api.billing.packs) as CreditPack[] | undefined;
  const checkout = useAction(api.billing.checkout);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const purchased = /purchase=success/.test(location.search);

  if (isLoading || me === undefined)
    return (
      <div className="acc-page">
        <p className="acc-muted">Loading your account…</p>
      </div>
    );
  if (!isAuthenticated || !me) {
    return (
      <div className="acc-page">
        <header className="acc-head">
          <h1>Account</h1>
          <p className="acc-lede">
            Sign in to keep your progress across devices, simplify explanations and generate your own courses.
          </p>
        </header>
        <button className="acc-primary" onClick={() => openSignIn()}>
          Sign in
        </button>
      </div>
    );
  }

  const buyPack = async (pack: CreditPack['key']) => {
    setBuying(pack);
    setError(null);
    try {
      const response = (await checkout({
        pack,
        returnUrl: `${platform() === 'desktop' ? PRODUCTION_WEB_URL : location.origin}/account?purchase=success`
      })) as { url: string } | { error: string };
      if ('url' in response) location.href = response.url;
      else {
        setError(response.error);
        setBuying(null);
      }
    } catch {
      setError('Checkout failed to start. Try again.');
      setBuying(null);
    }
  };

  return (
    <div className="acc-page">
      <header className="acc-head">
        <div className="acc-identity">
          <Avatar me={me} size={44} />
          <div>
            <h1>{me.name || 'Your account'}</h1>
            <p className="acc-muted">{me.email}</p>
          </div>
        </div>
        <button className="acc-secondary" onClick={() => getAuthClient()?.signOut()}>
          Sign out
        </button>
      </header>

      {purchased && (
        <div className="acc-notice">
          Payment received. Credits appear here within a few seconds of Polar confirming the order.
        </div>
      )}

      <section className="acc-balance">
        <div>
          <div className="acc-label">Credits</div>
          <div className="acc-big">{formatCredits(readCredits(me))}</div>
          {!me.isUnlimited && <div className="acc-muted">Enough for {countCourses(me.credits)} courses</div>}
        </div>
        <dl className="acc-costs">
          <div>
            <dt>Simplify a block</dt>
            <dd>{me.costs.simplify} credit</dd>
          </div>
          <div>
            <dt>Generate a course</dt>
            <dd>{me.costs.generateCourse} credits</dd>
          </div>
          <div>
            <dt>Re-reading a simplification</dt>
            <dd>free</dd>
          </div>
        </dl>
      </section>

      <section className="acc-section">
        <h2>Buy credits</h2>
        {packs === undefined && <p className="acc-muted">Loading packs…</p>}
        {packs && packs.length === 0 && <p className="acc-muted">Credit packs aren't on sale yet.</p>}
        {packs && packs.length > 0 && (
          <div className="acc-packs">
            {packs.map((pack) => (
              <div key={pack.key} className="acc-pack">
                <div className="acc-pack-credits">{countCourses(pack.credits)} courses</div>
                <div className="acc-pack-name">
                  {pack.name} · {pack.credits.toLocaleString()} credits, Simplify included
                </div>
                <div className="acc-pack-price">
                  {formatPrice(pack.priceCents, pack.currency)}{' '}
                  <span className="acc-pack-per">{formatPricePerCourse(pack)}</span>
                </div>
                <button className="acc-primary" disabled={!!buying} onClick={() => buyPack(pack.key)}>
                  {buying === pack.key ? 'Opening checkout…' : 'Buy'}
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="acc-error">{error}</p>}
        <p className="acc-fine">Payments are handled by Polar. Credits don't expire.</p>
      </section>

      <AgentKeys />

      <section className="acc-section">
        <h2>History</h2>
        {history && history.length === 0 && <p className="acc-muted">No activity yet.</p>}
        {history && history.length > 0 && (
          <table className="acc-table">
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td>{REASON_LABEL[entry.reason] ?? entry.reason}</td>
                  <td className="acc-when">{new Date(entry.at).toLocaleString()}</td>
                  <td className={`acc-delta ${entry.delta > 0 ? 'plus' : 'minus'}`}>
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function formatPricePerCourse(pack: CreditPack) {
  const courses = countCourses(pack.credits);
  if (pack.priceCents === null || courses === 0) return '';
  return `${formatPrice(Math.round(pack.priceCents / courses), pack.currency)} per course`;
}

function formatPrice(cents: number | null, currency: string) {
  if (cents === null) return 'Pay what you want';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(
      cents / 100
    );
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
