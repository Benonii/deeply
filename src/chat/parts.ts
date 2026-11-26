import { ChatText } from './ChatText';
import { CourseRequestToolCard } from './CourseRequestToolCard';
import { CoursesToolCard } from './CoursesToolCard';

export const ASSISTANT_PARTS = {
  Text: ChatText,
  tools: {
    by_name: {
      create_course_request: CourseRequestToolCard,
      show_courses: CoursesToolCard
    }
  }
};
