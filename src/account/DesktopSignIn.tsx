import { useDesktopPairing } from '../lib/hooks';

export const DesktopSignIn = () => {
  const { connectURL, checkCode, isFinishing, error } = useDesktopPairing();
  return (
    <div className="acc-providers">
      <a className="acc-provider" href={connectURL} target="_blank" rel="noreferrer">
        Sign in with your browser
      </a>
      <p className="acc-muted">
        Your browser opens Deeply. Check that it shows <span className="acc-code">{checkCode}</span>, then approve.
      </p>
      {isFinishing && <p className="acc-muted">Signing you in…</p>}
      {error && <p className="acc-error">{error}</p>}
    </div>
  );
};
