
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_ASSESSMENT_QUESTIONS } from './constants';
import { Assessment, AssessmentQuestion } from '@/types/database';
import { toast } from 'sonner';

/**
 * Creates a new assessment for the given store name
 */
export const createNewAssessment = async (storeName: string): Promise<Assessment | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      toast.error("Please log in to create an assessment");
      return null;
    }
    
    const userId = userData.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Create assessment record
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        user_id: userId,
        store_name: storeName,
        date: today,
        completed: false
      })
      .select()
      .single();
      
    if (assessmentError) {
      console.error("Error creating assessment:", assessmentError);
      toast.error("Failed to create assessment");
      return null;
    }
    
    // Create initial question records
    const questionsToInsert = DEFAULT_ASSESSMENT_QUESTIONS.map((question, index) => ({
      assessment_id: assessmentData.id,
      question_number: index + 1,
      question_text: question,
      answer: null,
      comment: null
    }));
    
    const { error: questionsError } = await supabase
      .from('assessment_questions')
      .insert(questionsToInsert);
      
    if (questionsError) {
      console.error("Error adding questions:", questionsError);
      toast.error("Failed to add questions to assessment");
      return null;
    }
    
    toast.success("Assessment created successfully!");
    return assessmentData as Assessment;
  } catch (error) {
    console.error("Error in createNewAssessment:", error);
    toast.error("An error occurred while creating the assessment");
    return null;
  }
};
