
// We need to make the handleCreateAssessment function async
const handleCreateAssessment = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!storeName.trim()) {
    toast.error("Please enter a store name");
    return;
  }
  
  setIsCreating(true);
  
  try {
    await createNewAssessment(storeName);
    setCurrentPage(0); // Reset to first page
  } finally {
    setIsCreating(false);
  }
};
