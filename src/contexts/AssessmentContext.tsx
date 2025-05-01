
import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { 
  Assessment, 
  AssessmentWithQuestions, 
  AssessmentQuestion, 
  QuestionWithImages, 
  AssessmentResult 
} from '@/types/database';

// Define the standard questions for an assessment
const standardQuestions = [
  { number: 1, text: "Are all fire exits clearly marked and unobstructed?" },
  { number: 2, text: "Is the first aid kit fully stocked and accessible?" },
  { number: 3, text: "Are all employees trained in emergency procedures?" },
  { number: 4, text: "Is all safety equipment in working order?" },
  { number: 5, text: "Are safety data sheets available for all hazardous materials?" },
  { number: 6, text: "Are all electrical equipment and cords in good condition?" },
  { number: 7, text: "Is personal protective equipment available and in use where required?" },
  { number: 8, text: "Are safety policies clearly displayed in the workplace?" },
  { number: 9, text: "Are waste materials properly disposed of?" },
  { number: 10, text: "Is the workplace kept clean and organized?" },
  { number: 11, text: "Are appropriate warning signs in place for hazardous areas?" },
  { number: 12, text: "Is lighting adequate in all work areas?" },
  { number: 13, text: "Are walking surfaces free of slip, trip, and fall hazards?" },
  { number: 14, text: "Are chemicals stored safely and properly labeled?" },
  { number: 15, text: "Is there a system in place for reporting hazards and incidents?" },
  { number: 16, text: "Are regular safety inspections conducted?" },
  { number: 17, text: "Are ventilation systems working properly?" },
  { number: 18, text: "Is machinery equipped with appropriate guards and safety devices?" },
  { number: 19, text: "Are noise levels controlled and hearing protection provided where needed?" },
  { number: 20, text: "Is manual handling training provided and proper equipment available?" }
];

interface AssessmentContextType {
  currentAssessment: AssessmentWithQuestions | null;
  savedAssessments: Assessment[];
  loading: boolean;
  fetchAssessments: () => Promise<void>;
  createNewAssessment: (storeName: string) => Promise<void>;
  loadAssessment: (assessmentId: string) => Promise<void>;
  updateQuestion: (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string | null, images: string[]) => Promise<void>;
  calculateResults: () => AssessmentResult;
  completeAssessment: () => Promise<void>;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentWithQuestions | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's saved assessments
  const fetchAssessments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: assessments, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      if (assessments) {
        setSavedAssessments(assessments);
      }
    } catch (error: any) {
      toast.error(`Error fetching assessments: ${error.message}`);
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new assessment
  const createNewAssessment = async (storeName: string) => {
    if (!user) {
      toast.error('You must be logged in to create an assessment');
      return;
    }
    
    try {
      // Insert new assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert([{
          user_id: user.id,
          store_name: storeName,
          date: new Date().toISOString(),
          completed: false
        }])
        .select()
        .single();
        
      if (assessmentError) {
        throw assessmentError;
      }
      
      if (!assessment) {
        throw new Error('Failed to create assessment');
      }
      
      // Create questions for the assessment
      const questionsToInsert = standardQuestions.map(q => ({
        assessment_id: assessment.id,
        question_number: q.number,
        question_text: q.text,
        answer: null,
        comment: null
      }));
      
      const { data: questions, error: questionsError } = await supabase
        .from('assessment_questions')
        .insert(questionsToInsert)
        .select();
        
      if (questionsError) {
        throw questionsError;
      }
      
      // Add images array to each question
      const questionsWithImages: QuestionWithImages[] = questions.map((q: AssessmentQuestion) => ({
        ...q,
        images: []
      }));
      
      // Set the current assessment
      setCurrentAssessment({
        ...assessment,
        questions: questionsWithImages
      });
      
      // Update the saved assessments list
      setSavedAssessments(prev => [assessment, ...prev]);
      
      toast.success('New assessment created');
    } catch (error: any) {
      toast.error(`Error creating assessment: ${error.message}`);
      console.error('Error creating assessment:', error);
    }
  };
  
  // Load an existing assessment
  const loadAssessment = async (assessmentId: string) => {
    if (!user) {
      toast.error('You must be logged in to load an assessment');
      return;
    }
    
    try {
      // Fetch the assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('user_id', user.id)
        .single();
        
      if (assessmentError) {
        throw assessmentError;
      }
      
      // Fetch the questions
      const { data: questions, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('question_number');
        
      if (questionsError) {
        throw questionsError;
      }
      
      // For each question, fetch associated images
      const questionsWithImages = await Promise.all(questions.map(async (question: AssessmentQuestion) => {
        const { data: images, error: imagesError } = await supabase
          .from('question_images')
          .select('image_url')
          .eq('question_id', question.id);
          
        if (imagesError) {
          console.error(`Error fetching images for question ${question.id}:`, imagesError);
          return { ...question, images: [] as string[] };
        }
        
        return {
          ...question,
          images: images.map((img: { image_url: string }) => img.image_url)
        } as QuestionWithImages;
      }));
      
      // Set the current assessment
      setCurrentAssessment({
        ...assessment,
        questions: questionsWithImages
      });
    } catch (error: any) {
      toast.error(`Error loading assessment: ${error.message}`);
      console.error('Error loading assessment:', error);
    }
  };
  
  // Update a question's answer, comment, and images
  const updateQuestion = async (
    questionId: string, 
    answer: 'yes' | 'no' | 'n/a' | null, 
    comment: string | null, 
    images: string[]
  ) => {
    if (!currentAssessment) return;
    
    try {
      // Update the question in the database
      const { error: updateError } = await supabase
        .from('assessment_questions')
        .update({ 
          answer,
          comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId);
        
      if (updateError) {
        throw updateError;
      }
      
      // Update images
      // First, delete all existing images
      await supabase
        .from('question_images')
        .delete()
        .eq('question_id', questionId);
        
      // Then add new images if any
      if (images.length > 0) {
        const imagesToInsert = images.map(url => ({
          question_id: questionId,
          image_url: url
        }));
        
        const { error: imagesError } = await supabase
          .from('question_images')
          .insert(imagesToInsert);
          
        if (imagesError) {
          throw imagesError;
        }
      }
      
      // Update the current assessment in state
      setCurrentAssessment(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          questions: prev.questions.map(q => 
            q.id === questionId 
              ? { ...q, answer, comment, images } 
              : q
          )
        };
      });
      
      toast.success('Question updated');
    } catch (error: any) {
      toast.error(`Error updating question: ${error.message}`);
      console.error('Error updating question:', error);
    }
  };
  
  // Calculate assessment results
  const calculateResults = (): AssessmentResult => {
    if (!currentAssessment) {
      return {
        totalQuestions: 0,
        applicableQuestions: 0,
        yesAnswers: 0,
        percentage: 0
      };
    }
    
    const totalQuestions = currentAssessment.questions.length;
    const applicableQuestions = currentAssessment.questions.filter(q => q.answer !== 'n/a').length;
    const yesAnswers = currentAssessment.questions.filter(q => q.answer === 'yes').length;
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
  
  // Mark an assessment as complete
  const completeAssessment = async () => {
    if (!currentAssessment) return;
    
    try {
      const { error } = await supabase
        .from('assessments')
        .update({ 
          completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAssessment.id);
        
      if (error) {
        throw error;
      }
      
      // Update the current assessment
      setCurrentAssessment(prev => {
        if (!prev) return null;
        return { ...prev, completed: true };
      });
      
      // Update saved assessments
      setSavedAssessments(prev => 
        prev.map(a => 
          a.id === currentAssessment.id ? { ...a, completed: true } : a
        )
      );
      
      toast.success('Assessment completed!');
    } catch (error: any) {
      toast.error(`Error completing assessment: ${error.message}`);
      console.error('Error completing assessment:', error);
    }
  };
  
  // Refresh assessments list when user changes
  useEffect(() => {
    if (user) {
      fetchAssessments();
    } else {
      setSavedAssessments([]);
      setCurrentAssessment(null);
      setLoading(false);
    }
  }, [user]);
  
  const value = {
    currentAssessment,
    savedAssessments,
    loading,
    fetchAssessments,
    createNewAssessment,
    loadAssessment,
    updateQuestion,
    calculateResults,
    completeAssessment
  };
  
  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (context === undefined) {
    throw new Error('useAssessment must be used within an AssessmentProvider');
  }
  return context;
};
