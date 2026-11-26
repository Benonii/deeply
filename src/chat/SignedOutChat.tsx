import { openSignIn } from '../account';
import { BuiltinCourseLinks } from './BuiltinCourseLinks';

const SIGN_IN_REASON = 'Sign in to ask for a course.';

export const SignedOutChat = () => (
  <div className="chat-column chat-signed-out">
    <h1 className="chat-welcome-head">What do you want to learn?</h1>
    <p className="chat-welcome-lede">
      Ask in plain words. Your own Claude researches and writes the course; the cards here follow every step.
    </p>
    <article className="ccard chat-signin">
      <div className="ccard-head">
        <h2 className="ccard-title">Sign in to use the chat</h2>
      </div>
      <p className="ccard-tag">Your courses and live builds show up here as cards once you are signed in.</p>
      <div className="ccard-foot">
        <button className="btn primary ccard-open" type="button" onClick={() => openSignIn(SIGN_IN_REASON)}>
          Sign in
        </button>
      </div>
    </article>
    <BuiltinCourseLinks />
  </div>
);
