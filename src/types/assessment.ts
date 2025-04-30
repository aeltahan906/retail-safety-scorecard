
export type AnswerType = 'yes' | 'no' | 'na';

export interface QuestionItem {
  id: number;
  text: string;
  answer: AnswerType | null;
  comment: string;
  images: string[]; // Base64 encoded images
}

export interface Assessment {
  id: string;
  userId: string;
  storeName: string;
  date: string;
  questions: QuestionItem[];
  score: number | null;
  completed: boolean;
}

export interface AssessmentResult {
  totalQuestions: number;
  applicableQuestions: number;
  yesAnswers: number;
  percentage: number;
}
