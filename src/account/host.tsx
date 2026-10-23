import { useEffect, useState } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { FREE_COURSES_TEXT } from '../../convex/lib/pricing';
import { getAuthClient } from '../lib/authClient';
import './account.css';

const api = anyApi;

type SignInRequest = { reason?: string };
const listeners = new Set<(request: SignInRequest) => void>();
export function requestSignIn(request: SignInRequest = {}) {
  listeners.forEach((listener) => listener(request));
}

export function AccountHost() {
  const [request, setRequest] = useState<SignInRequest | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.wallet.ensure);

  useEffect(() => {
    const listener = (nextRequest: SignInRequest) => setRequest(nextRequest);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  useEffect(() => {
    if (isAuthenticated) {
      ensure({}).catch(() => {});
      setRequest(null);
    }
  }, [isAuthenticated, ensure]);

  if (!request) return null;
  return <SignInDialog reason={request.reason} onClose={() => setRequest(null)} />;
}

function SignInDialog({ reason, onClose }: { reason?: string; onClose: () => void }) {
  const providers = useQuery(api.auth.providers) as { github: boolean; google: boolean } | undefined;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const signIn = async (provider: 'github' | 'google') => {
    const auth = getAuthClient();
    if (!auth) return;
    setBusy(provider);
    setError(null);
    try {
      const response = await auth.signIn.social({ provider, callbackURL: window.location.href });
      if (response?.error) throw new Error(response.error.message || 'Sign-in failed');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign-in failed');
      setBusy(null);
    }
  };

  const none = providers && !providers.github && !providers.google;
  return (
    <div className="acc-scrim" onClick={onClose}>
      <div
        className="acc-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acc-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="acc-x" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 id="acc-title">Sign in</h2>
        <p className="acc-sub">
          {reason ?? 'Sign in to simplify explanations and generate courses.'} New accounts get {FREE_COURSES_TEXT}.
        </p>
        <div className="acc-providers">
          {providers?.github && (
            <button className="acc-provider" disabled={!!busy} onClick={() => signIn('github')}>
              <GitHubIcon /> {busy === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
            </button>
          )}
          {providers?.google && (
            <button className="acc-provider" disabled={!!busy} onClick={() => signIn('google')}>
              <GoogleIcon /> {busy === 'google' ? 'Redirecting…' : 'Continue with Google'}
            </button>
          )}
          {providers === undefined && <p className="acc-muted">Loading sign-in options…</p>}
          {none && <p className="acc-muted">Sign-in isn't configured on this deployment yet.</p>}
        </div>
        {error && <p className="acc-error">{error}</p>}
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12Z"
      />
    </svg>
  );
}
