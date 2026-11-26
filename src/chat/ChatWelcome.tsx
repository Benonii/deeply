import { ThreadPrimitive } from '@assistant-ui/react';

import { BuiltinCourseLinks } from './BuiltinCourseLinks';
import { CourseCardList } from './CourseCardList';

const SUGGESTIONS = [
  'Make me a course on WebGPU compute shaders',
  'Make me a course on how Postgres indexes work',
  'Show my courses'
];

export const ChatWelcome = () => (
  <div className="chat-welcome">
    <h1 className="chat-welcome-head">What do you want to learn?</h1>
    <p className="chat-welcome-lede">
      Ask in plain words. Your own Claude researches and writes the course; the card here follows every step.
    </p>
    <div className="chat-chips">
      {SUGGESTIONS.map((suggestion) => (
        <ThreadPrimitive.Suggestion key={suggestion} className="chat-chip" prompt={suggestion} send>
          {suggestion}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
    <section className="chat-yours">
      <h2 className="chat-section-head">Your courses and builds</h2>
      <CourseCardList filter="all" />
    </section>
    <BuiltinCourseLinks />
  </div>
);
