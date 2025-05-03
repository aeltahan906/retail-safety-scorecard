
import { AssessmentQuestion, AssessmentResult } from '@/types/database';
import { AssessmentWithQuestions } from './types';

// Calculate assessment results
export const calculateAssessmentResults = (assessment: AssessmentWithQuestions | null): AssessmentResult => {
  if (!assessment || !assessment.questions || assessment.questions.length === 0) {
    return { totalQuestions: 0, applicableQuestions: 0, yesAnswers: 0, percentage: 0 };
  }
  
  // Filter out questions with invalid data
  const validQuestions = assessment.questions.filter(q => q && typeof q.question_number === 'number');
  
  const totalQuestions = validQuestions.length;
  const applicableQuestions = validQuestions.filter(q => q.answer !== null && q.answer !== 'n/a').length;
  const yesAnswers = validQuestions.filter(q => q.answer === 'yes').length;
  
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
