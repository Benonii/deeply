import { NotFound } from '../platform/NotFound';

export const MissingPage = () => (
  <main className="main">
    <NotFound what="page" back="/" />
  </main>
);
