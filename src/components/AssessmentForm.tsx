
import React from 'react';
import QuestionCard from './QuestionCard';
import { useAssessment } from '@/contexts/AssessmentContext';

const AssessmentForm: React.FC = () => {
  const { currentAssessment, updateQuestion } = useAssessment();
  
  if (!currentAssessment) {
    return <div className="p-4 text-center">No assessment loaded</div>;
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
      {sortedQuestions.map((question) => (
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
      ))}
    </div>
  );
};

export default AssessmentForm;
