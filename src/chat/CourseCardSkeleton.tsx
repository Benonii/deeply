export const CourseCardSkeleton = () => (
  <article className="ccard ccard-skeleton" aria-hidden>
    <div className="ccard-head">
      <span className="cskel cskel-title" />
      <span className="cskel cskel-state" />
    </div>
    <span className="cskel cskel-tag" />
    <div className="ccard-progress">
      <div className="ccard-bar" />
      <span className="cskel cskel-meter" />
    </div>
    <div className="ccard-foot">
      <span className="cskel cskel-button" />
    </div>
  </article>
);
