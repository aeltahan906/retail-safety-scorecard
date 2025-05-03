
import React, { useEffect } from 'react';
import { toast } from 'sonner';
import QuestionCard from './QuestionCard';
import { useAssessment } from '@/contexts/AssessmentContext';

const AssessmentForm: React.FC = () => {
  const { currentAssessment, updateQuestion, loading } = useAssessment();
  
  useEffect(() => {
    if (!currentAssessment && !loading) {
      console.error("No assessment loaded, but loading is complete");
      toast.error("Failed to load assessment data");
    }
  }, [currentAssessment, loading]);
  
  if (loading) {
    return <div className="p-4 text-center">Loading assessment...</div>;
  }
  
  if (!currentAssessment) {
    return <div className="p-4 text-center">No assessment loaded. Please create or select an assessment.</div>;
  }
  
  // Sort questions by question number
  const sortedQuestions = [...currentAssessment.questions].sort(
    (a, b) => a.question_number - b.question_number
  );
  
  // Handler for when a question is updated
  const handleQuestionUpdate = (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string, images: string[]) => {
    updateQuestion(questionId, answer, comment, images);
  };
  
  return (
    <div className="p-4">
      {sortedQuestions.length > 0 ? (
        sortedQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            id={question.id}
            questionNumber={question.question_number}
            questionText={question.question_text}
            answer={question.answer}
            comment={question.comment}
            images={question.images || []}
            onUpdate={(answer, comment, images) => 
              handleQuestionUpdate(question.id, answer, comment, images)
            }
          />
        ))
      ) : (
        <div className="p-4 text-center">No questions found for this assessment.</div>
      )}
    </div>
  );
};

export default AssessmentForm;
