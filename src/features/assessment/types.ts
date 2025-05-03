
import { Assessment, AssessmentQuestion, AssessmentResult } from '@/types/database';

export interface AssessmentWithQuestions extends Assessment {
  questions: AssessmentQuestion[];
}

export type AssessmentContextType = {
  currentAssessment: AssessmentWithQuestions | null;
  savedAssessments: AssessmentWithQuestions[];
  loading: boolean;
  fetchAssessments: () => Promise<void>;
  createNewAssessment: (storeName: string) => Promise<void>;
  updateQuestion: (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string | null, images: string[]) => void;
  calculateResults: () => AssessmentResult;
  loadAssessment: (assessmentId: string) => Promise<void>;
  completeAssessment: () => Promise<void>;
  uploadImage: (file: File, questionId: string) => Promise<string | null>;
  createAssessment: (storeName: string) => Promise<Assessment | null>;
};
