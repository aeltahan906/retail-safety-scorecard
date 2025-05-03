
import { AssessmentQuestion, AssessmentResult } from '@/types/database';
import { AssessmentWithQuestions } from './types';

// Calculate assessment results
export const calculateAssessmentResults = (assessment: AssessmentWithQuestions | null): AssessmentResult => {
  if (!assessment) {
    return { totalQuestions: 0, applicableQuestions: 0, yesAnswers: 0, percentage: 0 };
  }
  
  const totalQuestions = assessment.questions.length;
  const applicableQuestions = assessment.questions.filter(q => q.answer !== 'n/a').length;
  const yesAnswers = assessment.questions.filter(q => q.answer === 'yes').length;
  
  const percentage = applicableQuestions > 0
    ? Math.round((yesAnswers / applicableQuestions) * 100)
    : 0;
    
  return {
    totalQuestions,
    applicableQuestions,
    yesAnswers,
    percentage
  };
};
