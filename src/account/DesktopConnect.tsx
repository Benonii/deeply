import { useState } from 'react';
import { useConvexAuth, useMutation } from 'convex/react';
import { anyApi } from 'convex/server';
import { getAuthClient } from '../lib/authClient';
import { formatCheckCode, readPairingCodeFromURL } from '../lib/desktopPairing';
import { PAIRING_CODE_PATTERN } from '../../convex/lib/desktopPairing';
import { DesktopConnectFrame } from './DesktopConnectFrame';
import { requestSignIn } from './host';
import './account.css';

const api = anyApi;

export const DesktopConnect = () => {
  const [pairingCode] = useState(readPairingCodeFromURL);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const approve = useMutation(api.desktopSignIn.approve);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectDesktop = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await getAuthClient()?.oneTimeToken.generate();
      const oneTimeToken = response?.data?.token;
      if (!oneTimeToken) throw new Error('Could not create a sign-in for the desktop app.');
      await approve({ pairingCode, oneTimeToken });
      setIsConnected(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setIsConnecting(false);
    }
  };

  if (!PAIRING_CODE_PATTERN.test(pairingCode)) {
    return (
      <DesktopConnectFrame>
        <p className="acc-muted">This link is not valid. Start signing in from the Deeply desktop app.</p>
      </DesktopConnectFrame>
    );
  }
  if (isConnected) {
    return (
      <DesktopConnectFrame>
        <p className="acc-lede">You're signed in on the desktop app. You can close this tab.</p>
      </DesktopConnectFrame>
    );
  }
  if (isLoading) {
    return (
      <DesktopConnectFrame>
        <p className="acc-muted">Loading your account…</p>
      </DesktopConnectFrame>
    );
  }
  return (
    <DesktopConnectFrame>
      <p className="acc-lede">
        Only continue if the Deeply desktop app on your computer shows{' '}
        <span className="acc-code">{formatCheckCode(pairingCode)}</span>.
      </p>
      {isAuthenticated ? (
        <button type="button" className="acc-primary" disabled={isConnecting} onClick={connectDesktop}>
          {isConnecting ? 'Connecting…' : 'Sign in the desktop app'}
        </button>
      ) : (
        <button
          type="button"
          className="acc-primary"
          onClick={() => requestSignIn({ reason: 'Sign in here first, then approve the desktop app.' })}
        >
          Sign in
        </button>
      )}
      {error && <p className="acc-error">{error}</p>}
    </DesktopConnectFrame>
  );
};
