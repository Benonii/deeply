import { useDesktopPairing } from '../lib/hooks';

export const DesktopSignIn = () => {
  const { openSignInPage, connectURL, checkCode, isFinishing, error } = useDesktopPairing();
  return (
    <div className="acc-providers">
      <button type="button" className="acc-provider" onClick={openSignInPage}>
        Sign in with your browser
      </button>
      <p className="acc-muted">
        Your browser opens Deeply. Check that it shows <span className="acc-code">{checkCode}</span>, then approve.
      </p>
      <p className="acc-fallback">
        Browser didn't open? Go to <span className="acc-url">{connectURL}</span>
      </p>
      {isFinishing && <p className="acc-muted">Signing you in…</p>}
      {error && <p className="acc-error">{error}</p>}
    </div>
  );
};
