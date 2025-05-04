
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Assessment, AssessmentQuestion } from '@/types/database';
import { AssessmentWithQuestions } from './types';
import { DEFAULT_QUESTIONS } from './constants';
import { TablesInsert } from '@/integrations/supabase/types';

// Create a new assessment in the database
export const createAssessment = async (storeName: string, userId: string): Promise<Assessment | null> => {
  try {
    const newAssessment = {
      store_name: storeName,
      user_id: userId,
      date: new Date().toISOString(),
      completed: false
    } as TablesInsert<"assessments">;

    const { data, error } = await supabase
      .from('assessments')
      .insert(newAssessment)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating assessment:', error);
      toast.error('Failed to create assessment');
      return null;
    }
    
    return data as Assessment;
  } catch (error) {
    console.error('Exception in createAssessment:', error);
    toast.error('An unexpected error occurred while creating the assessment.');
    return null;
  }
};

// Create questions for an assessment
export const createQuestionsForAssessment = async (assessmentId: string): Promise<AssessmentQuestion[] | null> => {
  try {
    const questionsToInsert = DEFAULT_QUESTIONS.map((q) => ({
      assessment_id: assessmentId,
      question_number: q.question_number,
      question_text: q.question_text,
      answer: null,
      comment: null
    } as TablesInsert<"assessment_questions">));
    
    const { data: questionsData, error: questionsError } = await supabase
      .from('assessment_questions')
      .insert(questionsToInsert)
      .select();
      
    if (questionsError) {
      console.error('Error creating questions:', questionsError);
      toast.error('Failed to create assessment questions');
      return null;
    }
    
    if (!questionsData) {
      console.error('No data returned after creating questions');
      toast.error('Failed to create assessment questions');
      return null;
    }
    
    const formattedQuestions: AssessmentQuestion[] = [];
    
    for (const question of questionsData) {
      if (!question) continue;
      
      formattedQuestions.push({
        id: question.id,
        assessment_id: question.assessment_id,
        question_number: question.question_number,
        question_text: question.question_text,
        answer: question.answer as 'yes' | 'no' | 'n/a' | null,
        comment: question.comment,
        created_at: question.created_at,
        updated_at: question.updated_at,
        images: []
      });
    }
    
    return formattedQuestions;
  } catch (error) {
    console.error('Exception in createQuestionsForAssessment:', error);
    toast.error('An unexpected error occurred while creating assessment questions.');
    return null;
  }
};

// Fetch all assessments for a user
export const fetchAssessmentsForUser = async (userId: string): Promise<AssessmentWithQuestions[]> => {
  try {
    // Fetch assessments
    const { data: assessmentsData, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      toast.error('Failed to load assessments');
      return [];
    }
    
    if (!assessmentsData || assessmentsData.length === 0) {
      console.log('No assessments found for user:', userId);
      return [];
    }
    
    // Fetch questions for each assessment
    const assessmentsWithQuestions: AssessmentWithQuestions[] = [];
    
    for (const assessment of assessmentsData) {
      if (!assessment || !assessment.id) continue;
      
      const { data: questionsData, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessment.id);
        
      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        continue;
      }
      
      if (!questionsData || questionsData.length === 0) {
        console.log('No questions found for assessment:', assessment.id);
        continue;
      }
      
      // Fetch images for each question
      const questionsWithImages = await Promise.all(questionsData.map(async (question) => {
        if (!question || !question.id) return null;
        
        const { data: imagesData, error: imagesError } = await supabase
          .from('question_images')
          .select('image_url')
          .eq('question_id', question.id);
          
        if (imagesError) {
          console.error('Error fetching images for question:', question.id, imagesError);
          return { 
            ...question,
            images: [] as string[],
            answer: question.answer as 'yes' | 'no' | 'n/a' | null 
          };
        }
        
        if (!imagesData) {
          return { 
            ...question,
            images: [] as string[],
            answer: question.answer as 'yes' | 'no' | 'n/a' | null 
          };
        }
        
        const images = imagesData
          .filter(img => img && typeof img === 'object' && 'image_url' in img)
          .map(img => img.image_url)
          .filter(Boolean) as string[];
        
        return { 
          ...question,
          images, 
          answer: question.answer as 'yes' | 'no' | 'n/a' | null 
        };
      }));
      
      // Filter out any null questions
      const validQuestions = questionsWithImages.filter((q): q is AssessmentQuestion => q !== null);
      
      assessmentsWithQuestions.push({
        ...assessment,
        questions: validQuestions
      } as AssessmentWithQuestions);
    }
    
    return assessmentsWithQuestions;
  } catch (error) {
    console.error('Error in fetchAssessments:', error);
    toast.error('An unexpected error occurred while fetching assessments.');
    return [];
  }
};

// Load a specific assessment
export const loadAssessmentById = async (assessmentId: string): Promise<AssessmentWithQuestions | null> => {
  try {
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();
      
    if (assessmentError) {
      console.error('Error loading assessment:', assessmentError);
      toast.error('Failed to load assessment');
      return null;
    }
    
    if (!assessmentData) {
      console.error('Assessment not found:', assessmentId);
      toast.error('Assessment not found');
      return null;
    }
    
    const { data: questionsData, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId);
      
    if (questionsError) {
      console.error('Error loading questions:', questionsError);
      toast.error('Failed to load assessment questions');
      return null;
    }
    
    if (!questionsData || questionsData.length === 0) {
      console.warn('No questions found for assessment:', assessmentId);
      return {
        ...assessmentData,
        questions: []
      } as AssessmentWithQuestions;
    }
    
    // Fetch images for each question
    const questionsWithImages = await Promise.all(questionsData.map(async (question) => {
      if (!question || !question.id) return null;
      
      const { data: imagesData, error: imagesError } = await supabase
        .from('question_images')
        .select('image_url')
        .eq('question_id', question.id);
        
      if (imagesError) {
        console.error('Error fetching images for question:', question.id, imagesError);
        return { 
          ...question,
          images: [] as string[],
          answer: question.answer as 'yes' | 'no' | 'n/a' | null 
        };
      }
      
      if (!imagesData) {
        return { 
          ...question,
          images: [] as string[],
          answer: question.answer as 'yes' | 'no' | 'n/a' | null 
        };
      }
      
      const images = imagesData
        .filter(img => img && typeof img === 'object' && 'image_url' in img)
        .map(img => img.image_url)
        .filter(Boolean) as string[];
      
      return { 
        ...question,
        images, 
        answer: question.answer as 'yes' | 'no' | 'n/a' | null 
      };
    }));
    
    // Filter out any null questions
    const validQuestions = questionsWithImages.filter((q): q is AssessmentQuestion => q !== null);
    
    return {
      ...assessmentData,
      questions: validQuestions
    } as AssessmentWithQuestions;
  } catch (error) {
    console.error('Error in loadAssessment:', error);
    toast.error('An unexpected error occurred while loading the assessment.');
    return null;
  }
};

// Update a question
export const updateQuestionInDb = async (
  questionId: string, 
  answer: 'yes' | 'no' | 'n/a' | null, 
  comment: string | null
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('assessment_questions')
      .update({ 
        answer: answer as string | null, 
        comment 
      })
      .eq('id', questionId);
      
    if (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to save answer');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateQuestion:', error);
    toast.error('An unexpected error occurred while updating the question.');
    return false;
  }
};

// Complete an assessment
export const markAssessmentComplete = async (assessmentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('assessments')
      .update({ completed: true })
      .eq('id', assessmentId);
      
    if (error) {
      console.error('Error completing assessment:', error);
      toast.error('Failed to complete assessment');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in completeAssessment:', error);
    toast.error('An unexpected error occurred while completing the assessment.');
    return false;
  }
};

// Upload an image
export const uploadImageForQuestion = async (
  file: File, 
  questionId: string, 
  userId: string, 
  assessmentId: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${assessmentId}/${questionId}/${fileName}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('assessment-images')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      toast.error('Failed to upload image');
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('assessment-images')
      .getPublicUrl(filePath);
      
    if (!urlData || !urlData.publicUrl) {
      toast.error('Failed to get image URL');
      return null;
    }
    
    // Save to question_images table
    const imageData = {
      question_id: questionId,
      image_url: urlData.publicUrl
    } as TablesInsert<"question_images">;
    
    const { error: saveError } = await supabase
      .from('question_images')
      .insert(imageData);
      
    if (saveError) {
      console.error('Error saving image reference:', saveError);
      toast.error('Failed to save image reference');
      return null;
    }
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    toast.error('An unexpected error occurred while uploading the image.');
    return null;
  }
};
