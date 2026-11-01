import type { ReactNode } from 'react';

interface DesktopConnectFrameProps {
  children: ReactNode;
}

export const DesktopConnectFrame = ({ children }: DesktopConnectFrameProps) => (
  <div className="acc-page">
    <header className="acc-head">
      <h1>Connect the desktop app</h1>
    </header>
    {children}
  </div>
);
