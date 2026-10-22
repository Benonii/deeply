import type React from 'react';
import type { Brand, CoursePack } from '../../convex/lib/courseSchema';
import type { Module } from './kit';

/** A course compiled into the app: either hand-built React modules or a JSON pack. */
export type BuiltinCourse = {
  id: string; // url slug: #/c/<id>
  title: string;
  tagline: string;
  summary: string;
  kind: 'concept' | 'repo';
  brand: Brand;
} & (
  | { format: 'react'; modules: Module[]; pages?: CoursePage[] }
  | { format: 'pack'; pack: CoursePack; pages?: CoursePage[] }
);

/** Extra course pages shown in the sidebar after the modules (playground, labs...). */
export type CoursePage = { id: string; label: string; badge?: string; Component: React.FC };
