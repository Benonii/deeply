import type React from 'react';
import type { Brand, CoursePack } from '../../convex/lib/courseSchema';
import type { Module } from './kit';

export type BuiltinCourse = {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  kind: 'concept' | 'repo';
  brand: Brand;
} & (
  | { format: 'react'; modules: Module[]; pages?: CoursePage[] }
  | { format: 'pack'; pack: CoursePack; pages?: CoursePage[] }
);

export type CoursePage = { id: string; label: string; badge?: string; Component: React.FC };
