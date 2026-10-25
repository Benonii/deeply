import { NotFound } from '../platform/CoursePages';

export const MissingPage = () => (
  <main className="main">
    <NotFound what="page" back="/" />
  </main>
);
