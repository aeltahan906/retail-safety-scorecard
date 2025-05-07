
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

// New functions to match the imports in AssessmentContext
export const createAssessment = async (storeName: string, userId: string): Promise<Assessment | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('assessments')
      .insert({
        user_id: userId,
        store_name: storeName,
        date: today,
        completed: false
      })
      .select()
      .single();
      
    if (error) {
      console.error("Error creating assessment:", error);
      return null;
    }
    
    return data as Assessment;
  } catch (error) {
    console.error("Error in createAssessment:", error);
    return null;
  }
};

export const createQuestionsForAssessment = async (assessmentId: string): Promise<AssessmentQuestion[] | null> => {
  try {
    const questionsToInsert = DEFAULT_ASSESSMENT_QUESTIONS.map((question, index) => ({
      assessment_id: assessmentId,
      question_number: index + 1,
      question_text: question,
      answer: null,
      comment: null
    }));
    
    const { data, error } = await supabase
      .from('assessment_questions')
      .insert(questionsToInsert)
      .select();
      
    if (error) {
      console.error("Error creating questions:", error);
      return null;
    }
    
    return data as AssessmentQuestion[];
  } catch (error) {
    console.error("Error in createQuestionsForAssessment:", error);
    return null;
  }
};

export const fetchAssessmentsForUser = async (userId: string) => {
  try {
    // Fetch all assessments for this user
    const { data: assessments, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (assessmentError) {
      console.error("Error fetching assessments:", assessmentError);
      return [];
    }
    
    // For each assessment, fetch its questions
    const assessmentsWithQuestions = await Promise.all(
      assessments.map(async (assessment) => {
        const { data: questions, error: questionsError } = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', assessment.id)
          .order('question_number', { ascending: true });
          
        if (questionsError) {
          console.error(`Error fetching questions for assessment ${assessment.id}:`, questionsError);
          return { ...assessment, questions: [] };
        }
        
        return { 
          ...assessment, 
          questions: questions as AssessmentQuestion[] 
        };
      })
    );
    
    return assessmentsWithQuestions;
  } catch (error) {
    console.error("Error in fetchAssessmentsForUser:", error);
    return [];
  }
};

export const loadAssessmentById = async (assessmentId: string) => {
  try {
    // Fetch the assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();
      
    if (assessmentError) {
      console.error("Error fetching assessment:", assessmentError);
      return null;
    }
    
    // Fetch the questions for this assessment
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('question_number', { ascending: true });
      
    if (questionsError) {
      console.error(`Error fetching questions for assessment ${assessmentId}:`, questionsError);
      return null;
    }
    
    // Fetch images for each question
    const questionsWithImages = await Promise.all(
      questions.map(async (question) => {
        const { data: images, error: imagesError } = await supabase
          .from('question_images')
          .select('image_url')
          .eq('question_id', question.id);
          
        if (imagesError) {
          console.error(`Error fetching images for question ${question.id}:`, imagesError);
          return { ...question, images: [] };
        }
        
        return {
          ...question,
          images: images.map(img => img.image_url)
        };
      })
    );
    
    return {
      ...assessment,
      questions: questionsWithImages
    };
  } catch (error) {
    console.error("Error in loadAssessmentById:", error);
    return null;
  }
};

export const updateQuestionInDb = async (
  questionId: string, 
  answer: 'yes' | 'no' | 'n/a' | null, 
  comment: string | null
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('assessment_questions')
      .update({ 
        answer,
        comment,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId);
      
    if (error) {
      console.error("Error updating question:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateQuestionInDb:", error);
    return false;
  }
};

export const markAssessmentComplete = async (assessmentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('assessments')
      .update({ 
        completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId);
      
    if (error) {
      console.error("Error marking assessment as complete:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in markAssessmentComplete:", error);
    return false;
  }
};

export const uploadImageForQuestion = async (
  file: File, 
  questionId: string,
  userId: string,
  assessmentId: string
): Promise<string | null> => {
  try {
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${assessmentId}/${questionId}/${uuidv4()}.${fileExt}`;
    const filePath = `question_images/${fileName}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase
      .storage
      .from('safety-assessments')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return null;
    }
    
    // Get public URL
    const { data } = supabase
      .storage
      .from('safety-assessments')
      .getPublicUrl(filePath);
      
    if (!data.publicUrl) {
      console.error("Could not get public URL for uploaded image");
      return null;
    }
    
    // Store in database
    const { error: dbError } = await supabase
      .from('question_images')
      .insert({
        question_id: questionId,
        image_url: data.publicUrl
      });
      
    if (dbError) {
      console.error("Error storing image reference in database:", dbError);
      return null;
    }
    
    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadImageForQuestion:", error);
    return null;
  }
};
