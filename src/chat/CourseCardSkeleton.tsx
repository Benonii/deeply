export const CourseCardSkeleton = () => (
  <article className="ccard ccard-skeleton" aria-hidden>
    <div className="ccard-head">
      <span className="skel skel-title" />
      <span className="skel skel-state" />
    </div>
    <span className="skel skel-tag" />
    <div className="ccard-progress">
      <div className="ccard-bar" />
      <span className="skel skel-meter" />
    </div>
    <div className="ccard-foot">
      <span className="skel skel-button" />
    </div>
  </article>
);
