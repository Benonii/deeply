import { BuiltinCourseLinks } from './BuiltinCourseLinks';

export const ChatOffline = () => (
  <div className="chat-column chat-signed-out">
    <h1 className="chat-welcome-head">The chat needs the Deeply backend.</h1>
    <p className="chat-welcome-lede">This copy of the app is not connected to one. The written courses still open.</p>
    <BuiltinCourseLinks />
  </div>
);
