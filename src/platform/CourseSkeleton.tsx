import { DEEPLY_BRAND } from '../engine/theme';
import { Shell } from './Shell';

const NAV_ITEM_WIDTHS = ['78%', '64%', '71%'];
const PARAGRAPH_LINE_WIDTHS = ['96%', '91%', '94%', '58%', '93%', '88%', '72%'];

function CourseNavSkeleton() {
  return (
    <div aria-hidden>
      <div className="side-course">
        <span className="side-course-kicker">Course</span>
        <span className="skel skel-nav" style={{ width: '70%', margin: '4px 0 0' }} />
      </div>
      <div className="nav-label">Modules</div>
      {NAV_ITEM_WIDTHS.map((width) => (
        <span key={width} className="skel skel-nav" style={{ width }} />
      ))}
    </div>
  );
}

export function CourseSkeleton() {
  return (
    <Shell brand={DEEPLY_BRAND} nav={<CourseNavSkeleton />}>
      <article className="module" aria-busy="true" aria-label="Loading course">
        <header className="module-head">
          <div className="module-head-inner">
            <span className="skel skel-eyebrow" />
            <span className="skel skel-heading" />
            <span className="skel skel-lede" />
          </div>
        </header>
        <div className="module-body">
          {PARAGRAPH_LINE_WIDTHS.map((width) => (
            <span key={width} className="skel skel-line" style={{ width }} />
          ))}
        </div>
      </article>
    </Shell>
  );
}
