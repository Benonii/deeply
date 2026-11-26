import { Link } from '@farm.js/core/client';

export function NotFound({ what, back }: { what: string; back: string }) {
  return (
    <div className="page-head">
      <div className="eyebrow">Not found</div>
      <h1>That {what} doesn't exist.</h1>
      <p className="lede">
        <Link href={back}>Go back</Link>
      </p>
    </div>
  );
}
