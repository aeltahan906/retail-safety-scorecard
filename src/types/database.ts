
export type Profile = {
  id: string;
  name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
};

export type Assessment = {
  id: string;
  user_id: string;
  store_name: string;
  date: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type AssessmentQuestion = {
  id: string;
  assessment_id: string;
  question_number: number;
  question_text: string;
  answer: 'yes' | 'no' | 'n/a' | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionImage = {
  id: string;
  question_id: string;
  image_url: string;
  created_at: string;
};

// Helper types for the frontend
export interface AssessmentWithQuestions extends Assessment {
  questions: AssessmentQuestion[];
}

export interface QuestionWithImages extends AssessmentQuestion {
  images: string[];
}

export interface AssessmentResult {
  totalQuestions: number;
  applicableQuestions: number;
  yesAnswers: number;
  percentage: number;
}
