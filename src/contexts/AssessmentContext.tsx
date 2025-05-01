import React, { createContext, useContext, useState, ReactNode } from 'react';

type Assessment = {
  id: number;
  storeName: string;
};

type AssessmentContextType = {
  createAssessment: (storeName: string) => Promise<Assessment>;
};

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const createAssessment = async (storeName: string): Promise<Assessment> => {
    const newAssessment = {
      id: Date.now(),
      storeName,
    };
    setAssessments((prev) => [...prev, newAssessment]);
    return newAssessment;
  };

  return (
    <AssessmentContext.Provider value={{ createAssessment }}>
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error('useAssessment must be used within an AssessmentProvider');
  }
  return context;
};
