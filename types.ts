
export type ModuleType = 'text' | 'video' | 'quiz' | 'cards' | 'timeline' | 'experiment';

export interface BaseModule {
  id: string;
  title: string;
  type: ModuleType;
}

export interface TextModule extends BaseModule {
  type: 'text';
  content: string; // HTML content
}

export interface VideoModule extends BaseModule {
  type: 'video';
  source: 'url' | 'upload';
  url?: string;
  filePath?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
}

export interface QuizModule extends BaseModule {
  type: 'quiz';
  questions: QuizQuestion[];
}

export interface Card {
  id: string;
  front: string;
  back: string;
}

export interface CardsModule extends BaseModule {
  type: 'cards';
  cards: Card[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  imagePath?: string;
}

export interface TimelineModule extends BaseModule {
  type: 'timeline';
  events: TimelineEvent[];
}

export interface ExperimentStep {
  id: string;
  title: string;
  description: string;
  imagePath?: string;
}

export interface ExperimentModule extends BaseModule {
  type: 'experiment';
  steps: ExperimentStep[];
}

export type Module = TextModule | VideoModule | QuizModule | CardsModule | TimelineModule | ExperimentModule;

export interface CourseSettings {
  courseName: string;
  mascotName?: string;
  school: string;
  authors: string;
  date: string;
  description: string;
  theme: {
    primaryColor: string;
    font: string;
  };
  language: string;
  mascotEnabled: boolean;
  showScore: boolean;
}

export interface MediaFile {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'video' | 'audio';
  blobUrl: string; // For local preview
  file?: File; // The actual file, for zipping
}

export type MascotPoseType = 'happy' | 'explaining' | 'thinking' | 'sad';

export interface MascotPose {
  type: MascotPoseType | string;
  path: string;
  blobUrl: string;
  file?: File;
}

export interface Course {
  id: string;
  settings: CourseSettings;
  modules: Module[];
  media: MediaFile[];
  mascot: MascotPose[];
}