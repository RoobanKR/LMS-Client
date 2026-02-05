// components/question/MCQQuestionForm.tsx
import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, Loader, FileText, X, Copy, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import TipTapEditor from '../tiptopEditor';
import GenerateQuestion from './GenerateQuestion';

interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionBlock {
  id: string;
  questionText: string;
  options: MCQOption[];
}

interface MCQQuestionFormProps {
  exerciseData: any;
  initialData?: any;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (questionData: any) => void;
  isSaving?: boolean;
  onGenerateQuestions?: () => void;
}

const MCQQuestionForm: React.FC<MCQQuestionFormProps> = ({
  breadcrumbs,
  exerciseData,
  initialData,
  isEditing = false,
  onClose,
  onSave,
  isSaving = false,
  onGenerateQuestions
}) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [questionBlocks, setQuestionBlocks] = useState<QuestionBlock[]>(
    initialData && initialData.length > 0
      ? initialData.map((q: any, index: number) => ({
        id: `block-${index}`,
        questionText: q.questionText || q.title || '',
        options: q.options?.length > 0
          ? q.options.map((opt: any, optIndex: number) => ({
            id: `opt-${index}-${optIndex}`,
            text: opt.text || opt.content || '',
            isCorrect: opt.isCorrect || false
          }))
          : [
            { id: `opt-${index}-1`, text: '', isCorrect: false },
            { id: `opt-${index}-2`, text: '', isCorrect: false }
          ]
      }))
      : [
        {
          id: 'block-1',
          questionText: '',
          options: [
            { id: 'opt-1-1', text: '', isCorrect: false },
            { id: 'opt-1-2', text: '', isCorrect: false }
          ]
        }
      ]
  );

  const [errors, setErrors] = useState<{
    blocks?: { [key: string]: { questionText?: string; options?: string; correctAnswer?: string } };
  }>({});

  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleQuestionChange = (blockId: string, value: string) => {
    setQuestionBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId ? { ...block, questionText: value } : block
      )
    );

    if (errors.blocks?.[blockId]?.questionText) {
      setErrors(prev => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: { ...prev.blocks?.[blockId], questionText: undefined }
        }
      }));
    }
  };

  const addOption = (blockId: string) => {
    setQuestionBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? {
            ...block,
            options: [
              ...block.options,
              { id: generateId(`opt-${blockId}`), text: '', isCorrect: false }
            ]
          }
          : block
      )
    );
  };

  const updateOptionText = (blockId: string, optionId: string, text: string) => {
    setQuestionBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? {
            ...block,
            options: block.options.map(opt =>
              opt.id === optionId ? { ...opt, text } : opt
            )
          }
          : block
      )
    );
  };

  const setCorrectAnswer = (blockId: string, optionId: string) => {
    setQuestionBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? {
            ...block,
            options: block.options.map(opt => ({
              ...opt,
              isCorrect: opt.id === optionId
            }))
          }
          : block
      )
    );
  };

  const removeOption = (blockId: string, optionId: string) => {
    setQuestionBlocks(blocks =>
      blocks.map(block => {
        if (block.id !== blockId) return block;

        if (block.options.length <= 2) {
          setErrors(prev => ({
            ...prev,
            blocks: {
              ...prev.blocks,
              [blockId]: { ...prev.blocks?.[blockId], options: 'Minimum 2 options required' }
            }
          }));
          return block;
        }

        return {
          ...block,
          options: block.options.filter(opt => opt.id !== optionId)
        };
      })
    );
  };

  const addQuestionBlock = () => {
    const newBlockId = generateId('block');
    setQuestionBlocks(blocks => [
      ...blocks,
      {
        id: newBlockId,
        questionText: '',
        options: [
          { id: `${newBlockId}-opt-1`, text: '', isCorrect: false },
          { id: `${newBlockId}-opt-2`, text: '', isCorrect: false }
        ]
      }
    ]);
  };

  const duplicateQuestionBlock = (blockId: string) => {
    const blockToDuplicate = questionBlocks.find(block => block.id === blockId);
    if (!blockToDuplicate) return;

    const newBlockId = generateId('block');
    setQuestionBlocks(blocks => [
      ...blocks,
      {
        id: newBlockId,
        questionText: blockToDuplicate.questionText,
        options: blockToDuplicate.options.map(opt => ({
          id: `${newBlockId}-${opt.id.split('-').slice(-2).join('-')}`,
          text: opt.text,
          isCorrect: opt.isCorrect
        }))
      }
    ]);
  };

  const removeQuestionBlock = (blockId: string) => {
    if (questionBlocks.length <= 1) {
      alert('At least one question block is required');
      return;
    }
    setQuestionBlocks(blocks => blocks.filter(block => block.id !== blockId));
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = questionBlocks.findIndex(block => block.id === blockId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questionBlocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...questionBlocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setQuestionBlocks(newBlocks);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = { blocks: {} };
    let isValid = true;

    questionBlocks.forEach((block) => {
      const blockErrors: { questionText?: string; options?: string; correctAnswer?: string } = {};

      if (!block.questionText.trim() || block.questionText === '<p></p>') {
        blockErrors.questionText = 'Question text is required';
        isValid = false;
      }

      const validOptions = block.options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        blockErrors.options = 'At least 2 options with text are required';
        isValid = false;
      }

      const hasCorrectAnswer = block.options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        blockErrors.correctAnswer = 'Please mark one option as correct answer';
        isValid = false;
      }

      if (Object.keys(blockErrors).length > 0) {
        newErrors.blocks![block.id] = blockErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 Current questionBlocks:', questionBlocks);

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    // Prepare array of questions from all blocks
    const questionsData = questionBlocks.map((block, index) => {
      // Extract options and correct answer
      const validOptions = block.options.filter(opt => opt.text.trim());
      const correctAnswerOption = block.options.find(opt => opt.isCorrect);

      if (!correctAnswerOption) {
        throw new Error(`Please select a correct answer for question ${index + 1}`);
      }

      return {
        questionType: 'mcq' as const,
        questionTitle: block.questionText.replace(/<[^>]*>/g, '').trim(),
        options: validOptions.map(opt => opt.text.trim()),
        correctAnswer: correctAnswerOption.text.trim(),
        score: 10,
        isActive: true,
        sequence: index
      };
    });

    console.log('📤 MCQ Payload being sent:', JSON.stringify(questionsData, null, 2));

    // Send array of questions to backend
    onSave(questionsData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white  shadow-2xl max-w-6xl w-full relative flex flex-col max-h-[95vh]">
        {/* Compact Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 rounded-t-xl z-10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Edit MCQ Questions' : 'Create MCQ Questions'}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {exerciseData.exerciseName} • {questionBlocks.length} question{questionBlocks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSaving}
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5">
            {/* Action Buttons */}
            <div className="mb-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-700 rounded-lg border-2 border-dashed border-purple-200 transition-all hover:shadow-sm font-medium text-sm"
                  disabled={isSaving}
                >
                  <div className="p-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span>Generate with AI</span>
                </button>

                <button
                  type="button"
                  onClick={addQuestionBlock}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border-2 border-dashed border-blue-200 transition-all hover:shadow-sm font-medium text-sm"
                  disabled={isSaving}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Question Block
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                {onGenerateQuestions ? "Use AI to generate questions or manually add them" : "Add multiple question blocks"}
              </p>
            </div>

            {/* Question Blocks Container - Scrollable within */}
            <div className="space-y-6">
              {questionBlocks.map((block, blockIndex) => (
                <div key={block.id} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                  {/* Compact Block Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {blockIndex + 1}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Question {blockIndex + 1}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={blockIndex === 0 || isSaving}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={blockIndex === questionBlocks.length - 1 || isSaving}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => duplicateQuestionBlock(block.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        disabled={isSaving}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      {questionBlocks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestionBlock(block.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          disabled={isSaving}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Split Layout for Question and Options */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: TipTap Editor for Question */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Question Text *
                      </label>
                      <div className={`rounded-lg ${errors.blocks?.[block.id]?.questionText ? 'ring-2 ring-red-400' : ''
                        }`}>
                        <TipTapEditor
                          value={block.questionText}
                          onChange={(value) => handleQuestionChange(block.id, value)}
                          placeholder="Enter your question here..."
                          minHeight="180px"
                          maxHeight="220px"
                          showToolbar={true}
                          editable={true}
                        />
                      </div>
                      {errors.blocks?.[block.id]?.questionText && (
                        <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {errors.blocks[block.id].questionText}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Options */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Options *
                          </label>
                          <p className="text-xs text-gray-500">Select one correct answer</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addOption(block.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors text-xs font-medium"
                          disabled={isSaving}
                        >
                          <Plus className="h-3 w-3" />
                          Add Option
                        </button>
                      </div>

                      {errors.blocks?.[block.id]?.options && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700 text-xs">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{errors.blocks[block.id].options}</span>
                          </div>
                        </div>
                      )}

                      {errors.blocks?.[block.id]?.correctAnswer && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700 text-xs">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{errors.blocks[block.id].correctAnswer}</span>
                          </div>
                        </div>
                      )}

                      {/* Options List */}
                      <div className={`space-y-2 ${block.options.length > 4 ? 'max-h-[280px] overflow-y-auto pr-2' : ''
                        }`}>
                        {block.options.map((option, optionIndex) => (
                          <div
                            key={option.id}
                            className={`flex items-center gap-3 p-2.5 border rounded-lg transition-all ${option.isCorrect
                              ? 'border-green-400 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 font-medium text-gray-700 text-xs">
                              {String.fromCharCode(65 + optionIndex)}
                            </div>

                            <div className="flex-1">
                              <input
                                type="text"
                                value={option.text}
                                onChange={(e) => updateOptionText(block.id, option.id, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 
                                         bg-white text-gray-700 placeholder-gray-400
                                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                         transition-all duration-200"
                                disabled={isSaving}
                              />
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`correct-answer-${block.id}`}
                                  checked={option.isCorrect}
                                  onChange={() => setCorrectAnswer(block.id, option.id)}
                                  className="h-3.5 w-3.5 text-green-600 focus:ring-green-500"
                                  disabled={isSaving}
                                />
                                <span className="text-xs font-medium text-gray-700">
                                  Correct
                                </span>
                              </label>

                              {block.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(block.id, option.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  disabled={isSaving}
                                  title="Delete option"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compact Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 mt-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {questionBlocks.length} question{questionBlocks.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      {isEditing ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      {isEditing ? 'Update' : 'Save'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {showGenerateModal && (
        <GenerateQuestion
          breadcrumbs={breadcrumbs}
          exerciseData={exerciseData}
          onClose={() => setShowGenerateModal(false)}
          onSave={(generatedQuestions) => {
            const newBlocks = generatedQuestions.map((question: any, index: number) => ({
              id: `generated-${Date.now()}-${index}`,
              questionText: question.description || question.title || question.questionText || '',
              options: question.options?.map((opt: any, optIndex: number) => ({
                id: `gen-opt-${index}-${optIndex}`,
                text: opt.text || opt.content || '',
                isCorrect: opt.isCorrect || false
              })) || [
                  { id: `gen-opt-${index}-1`, text: '', isCorrect: false },
                  { id: `gen-opt-${index}-2`, text: '', isCorrect: false }
                ]
            }));

            const updatedBlocks = [...questionBlocks];
            let generatedIndex = 0;

            for (let i = 0; i < updatedBlocks.length && generatedIndex < newBlocks.length; i++) {
              const block = updatedBlocks[i];
              const isEmpty = !block.questionText.trim() || block.questionText === '<p></p>';

              if (isEmpty) {
                updatedBlocks[i] = newBlocks[generatedIndex];
                generatedIndex++;
              }
            }

            if (generatedIndex < newBlocks.length) {
              const remainingBlocks = newBlocks.slice(generatedIndex);
              updatedBlocks.push(...remainingBlocks);
            }

            setQuestionBlocks(updatedBlocks);
            setShowGenerateModal(false);

            const filledCount = Math.min(
              questionBlocks.filter(b => !b.questionText.trim() || b.questionText === '<p></p>').length,
              newBlocks.length
            );
            const addedCount = Math.max(0, newBlocks.length - filledCount);

            if (filledCount > 0 && addedCount > 0) {
              alert(`✅ Filled ${filledCount} empty block(s) and added ${addedCount} new block(s)`);
            } else if (filledCount > 0) {
              alert(`✅ Filled ${filledCount} empty block(s)`);
            } else {
              alert(`✅ Added ${addedCount} new block(s)`);
            }
          }}
        />
      )}
    </div>
  );
};

export default MCQQuestionForm;