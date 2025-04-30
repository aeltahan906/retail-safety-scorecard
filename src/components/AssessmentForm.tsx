
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AnswerType } from '../types/assessment';
import { Check, X, HelpCircle, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionCardProps {
  questionNumber: number;
  questionText: string;
  answer: AnswerType | null;
  comment: string;
  images: string[];
  onUpdate: (answer: AnswerType | null, comment: string, images: string[]) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  questionNumber,
  questionText,
  answer,
  comment,
  images,
  onUpdate
}) => {
  const [localComment, setLocalComment] = useState(comment);
  const [localImages, setLocalImages] = useState<string[]>(images);
  
  const handleAnswerChange = (value: AnswerType) => {
    onUpdate(value, localComment, localImages);
  };
  
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalComment(e.target.value);
    onUpdate(answer, e.target.value, localImages);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Please select an image under 5MB");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target?.result as string;
      const updatedImages = [...localImages, base64Image];
      setLocalImages(updatedImages);
      onUpdate(answer, localComment, updatedImages);
      toast.success("Image uploaded successfully");
    };
    
    reader.readAsDataURL(file);
    
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };
  
  const removeImage = (indexToRemove: number) => {
    const updatedImages = localImages.filter((_, index) => index !== indexToRemove);
    setLocalImages(updatedImages);
    onUpdate(answer, localComment, updatedImages);
    toast.success("Image removed");
  };
  
  const getAnswerColor = (answerValue: AnswerType) => {
    if (answer !== answerValue) return "bg-white";
    
    switch (answerValue) {
      case 'yes': return "bg-hsse-lightGreen text-hsse-green border-hsse-green";
      case 'no': return "bg-red-50 text-red-600 border-red-300";
      case 'na': return "bg-gray-50 text-gray-600 border-gray-300";
      default: return "bg-white";
    }
  };
  
  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center space-x-2">
          <span className="bg-hsse-blue text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">
            {questionNumber}
          </span>
          <span>{questionText}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        <RadioGroup 
          value={answer || ''}
          onValueChange={(value) => handleAnswerChange(value as AnswerType)}
          className="flex space-x-2"
        >
          <div className={`flex items-center space-x-1 border rounded-md px-3 py-2 ${getAnswerColor('yes')}`}>
            <RadioGroupItem value="yes" id={`yes-${questionNumber}`} />
            <Label htmlFor={`yes-${questionNumber}`} className="flex items-center">
              <Check className="h-4 w-4 mr-1 text-hsse-green" />
              Yes
            </Label>
          </div>
          
          <div className={`flex items-center space-x-1 border rounded-md px-3 py-2 ${getAnswerColor('no')}`}>
            <RadioGroupItem value="no" id={`no-${questionNumber}`} />
            <Label htmlFor={`no-${questionNumber}`} className="flex items-center">
              <X className="h-4 w-4 mr-1 text-red-500" />
              No
            </Label>
          </div>
          
          <div className={`flex items-center space-x-1 border rounded-md px-3 py-2 ${getAnswerColor('na')}`}>
            <RadioGroupItem value="na" id={`na-${questionNumber}`} />
            <Label htmlFor={`na-${questionNumber}`} className="flex items-center">
              <HelpCircle className="h-4 w-4 mr-1 text-gray-500" />
              N/A
            </Label>
          </div>
        </RadioGroup>
        
        <div>
          <Label htmlFor={`comment-${questionNumber}`} className="text-sm">Comments</Label>
          <Textarea 
            id={`comment-${questionNumber}`} 
            placeholder="Add any relevant comments here" 
            value={localComment}
            onChange={handleCommentChange}
          />
        </div>
        
        <div>
          <Label htmlFor={`image-${questionNumber}`} className="text-sm block mb-2">
            Evidence Photos
          </Label>
          
          <div className="flex flex-wrap gap-2 mt-2 mb-4">
            {localImages.map((img, index) => (
              <div key={index} className="relative w-20 h-20 group">
                <img 
                  src={img} 
                  alt={`Evidence ${index + 1}`} 
                  className="w-full h-full object-cover rounded-md"
                />
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="w-5 h-5 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            <div className="w-20 h-20 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-hsse-blue transition-colors">
              <label htmlFor={`image-upload-${questionNumber}`} className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                <Camera className="h-6 w-6 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">Add Photo</span>
              </label>
              <Input 
                id={`image-upload-${questionNumber}`}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionCard;
