
import React, { createContext, useContext, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Assessment, AssessmentQuestion, AssessmentWithQuestions } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Define context types
export interface AssessmentContextType {
  currentAssessment: AssessmentWithQuestions | null;
  isLoading: boolean;
  createAssessment: (storeName: string) => Promise<string | null>;
  loadAssessment: (assessmentId: string) => Promise<boolean>;
  updateQuestion: (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string, images: string[]) => Promise<boolean>;
  completeAssessment: () => Promise<boolean>;
  calculateResults: () => { totalQuestions: number, applicableQuestions: number, yesAnswers: number, percentage: number };
  uploadImage: (file: File, questionId: string) => Promise<string | null>;
}

// Create context with default values
const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentWithQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create a new assessment
  const createAssessment = async (storeName: string): Promise<string | null> => {
    try {
      setIsLoading(true);
      
      // Create new assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          store_name: storeName,
          date: new Date().toISOString(),
        })
        .select()
        .single();

      if (assessmentError) {
        console.error('Error creating assessment:', assessmentError);
        toast.error('Error creating assessment');
        return null;
      }

      // Define default questions
      const questions = [
        { question_number: 1, question_text: "Is proper PPE worn by all personnel?" },
        { question_number: 2, question_text: "Are all emergency exits clearly marked?" },
        { question_number: 3, question_text: "Is fire safety equipment readily accessible?" },
        { question_number: 4, question_text: "Are walkways clear of obstructions?" },
        { question_number: 5, question_text: "Are hazardous materials properly stored?" },
        { question_number: 6, question_text: "Is electrical equipment in good condition?" },
        { question_number: 7, question_text: "Are safety signs clearly visible?" },
        { question_number: 8, question_text: "Is first aid equipment available and accessible?" },
        { question_number: 9, question_text: "Are staff trained in emergency procedures?" },
        { question_number: 10, question_text: "Is the facility clean and well-maintained?" },
      ];

      // Create questions for the new assessment
      const questionsToInsert = questions.map(q => ({
        assessment_id: assessmentData.id,
        question_number: q.question_number,
        question_text: q.question_text,
      }));

      const { data: questionData, error: questionError } = await supabase
        .from('assessment_questions')
        .insert(questionsToInsert)
        .select();

      if (questionError) {
        console.error('Error creating questions:', questionError);
        toast.error('Error creating questions');
        return null;
      }

      // Set up the current assessment with questions
      const newAssessment: AssessmentWithQuestions = {
        ...assessmentData,
        questions: questionData.map(q => ({ ...q, images: [] })),
      };

      setCurrentAssessment(newAssessment);
      toast.success('New assessment created');
      return assessmentData.id;

    } catch (error) {
      console.error('Error in createAssessment:', error);
      toast.error('Unexpected error creating assessment');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load an existing assessment
  const loadAssessment = async (assessmentId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Fetch assessment data
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) {
        console.error('Error loading assessment:', assessmentError);
        toast.error('Error loading assessment');
        return false;
      }

      // Fetch questions for this assessment
      const { data: questions, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('question_number', { ascending: true });

      if (questionsError) {
        console.error('Error loading questions:', questionsError);
        toast.error('Error loading questions');
        return false;
      }

      // Fetch images for all questions
      const questionsWithImages = await Promise.all(
        questions.map(async (question) => {
          const { data: images, error: imagesError } = await supabase
            .from('question_images')
            .select('image_url')
            .eq('question_id', question.id);

          if (imagesError) {
            console.error(`Error loading images for question ${question.id}:`, imagesError);
            return { ...question, images: [] };
          }

          return { 
            ...question, 
            images: images.map(img => img.image_url) 
          };
        })
      );

      // Set up the current assessment with questions and images
      setCurrentAssessment({
        ...assessment,
        questions: questionsWithImages,
      });
      
      return true;
    } catch (error) {
      console.error('Error in loadAssessment:', error);
      toast.error('Unexpected error loading assessment');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update a question's answer
  const updateQuestion = async (
    questionId: string, 
    answer: 'yes' | 'no' | 'n/a' | null, 
    comment: string,
    images: string[]
  ): Promise<boolean> => {
    if (!currentAssessment) return false;

    try {
      // Update the question in database
      const { error } = await supabase
        .from('assessment_questions')
        .update({
          answer,
          comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', questionId);

      if (error) {
        console.error('Error updating question:', error);
        toast.error('Error saving answer');
        return false;
      }

      // Update local state
      setCurrentAssessment(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          questions: prev.questions.map(q => 
            q.id === questionId 
              ? { ...q, answer, comment, images }
              : q
          ),
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error in updateQuestion:', error);
      toast.error('Unexpected error saving answer');
      return false;
    }
  };

  // Mark assessment as complete
  const completeAssessment = async (): Promise<boolean> => {
    if (!currentAssessment) return false;
    
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentAssessment.id);

      if (error) {
        console.error('Error completing assessment:', error);
        toast.error('Error completing assessment');
        return false;
      }

      setCurrentAssessment(prev => {
        if (!prev) return null;
        return { ...prev, completed: true };
      });
      
      toast.success('Assessment completed successfully');
      return true;
    } catch (error) {
      console.error('Error in completeAssessment:', error);
      toast.error('Unexpected error completing assessment');
      return false;
    }
  };

  // Calculate assessment results
  const calculateResults = () => {
    if (!currentAssessment) {
      return { totalQuestions: 0, applicableQuestions: 0, yesAnswers: 0, percentage: 0 };
    }
    
    const totalQuestions = currentAssessment.questions.length;
    const applicableQuestions = currentAssessment.questions.filter(q => q.answer !== 'n/a').length;
    const yesAnswers = currentAssessment.questions.filter(q => q.answer === 'yes').length;
    const percentage = applicableQuestions > 0 
      ? Math.round((yesAnswers / applicableQuestions) * 100) 
      : 0;
    
    return { totalQuestions, applicableQuestions, yesAnswers, percentage };
  };

  // Upload an image for a question
  const uploadImage = async (file: File, questionId: string): Promise<string | null> => {
    if (!currentAssessment) return null;
    
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${questionId}/${uuidv4()}.${fileExt}`;
      const filePath = `${currentAssessment.user_id}/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('assessment-images')
        .upload(filePath, file);
        
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return null;
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('assessment-images')
        .getPublicUrl(filePath);
        
      const imageUrl = urlData.publicUrl;
      
      // Store the image reference in database
      const { error: dbError } = await supabase
        .from('question_images')
        .insert({
          question_id: questionId,
          image_url: imageUrl,
        });
        
      if (dbError) {
        console.error('Error saving image reference:', dbError);
        return null;
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      return null;
    }
  };

  return (
    <AssessmentContext.Provider value={{
      currentAssessment,
      isLoading,
      createAssessment,
      loadAssessment,
      updateQuestion,
      completeAssessment,
      calculateResults,
      uploadImage,
    }}>
      {children}
    </AssessmentContext.Provider>
  );
};

// Custom hook to use assessment context
export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (context === undefined) {
    throw new Error('useAssessment must be used within an AssessmentProvider');
  }
  return context;
};
