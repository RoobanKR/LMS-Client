import React, { useState, useEffect } from 'react';
import { X, Save, FileText, MessageSquare, AlertCircle, Plus, Trash2 } from 'lucide-react';
import TipTapEditor from '../tiptopEditor'; // Adjust the import path as needed

interface FrontendQuestionFormProps {
  exerciseData: any;
  tabType: string;
  initialData?: any;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (questionData: any) => void;
  isSaving: boolean;
  saveProgress: number;
  saveMessage: string;
}

interface Hint {
  hintText: string;
  pointsDeduction: number;
  isPublic: boolean;
  sequence: number;
}

const FrontendQuestionForm: React.FC<FrontendQuestionFormProps> = ({
  exerciseData,
  initialData,
  isEditing,
  onClose,
  onSave,
  isSaving,
  saveProgress,
  saveMessage
}) => {
  const [formData, setFormData] = useState({
    questionText: '',
    title: '',
    description: '',
    constraints: [''],
    example: '', // Changed from sampleInput to example
    hint: '',
    difficulty: 'medium',
    timeLimit: 2000,
    memoryLimit: 256,
    score: 10
  });

  const [hints, setHints] = useState<Hint[]>([]);
  const [showToast, setShowToast] = useState(false);

  // Load initial data
  useEffect(() => {
    if (initialData && isEditing) {
      console.log('📝 Loading frontend question data for editing:', initialData);

      setFormData({
        questionText: '',
        title: initialData.title || '',
        description: initialData.description || '',
        constraints: initialData.constraints?.length ? initialData.constraints : [''],
        example: initialData.example || initialData.sampleInput || '', // Map from sampleInput to example
        hint: initialData.hints?.[0]?.hintText || '',
        difficulty: initialData.difficulty || 'medium',
        timeLimit: initialData.timeLimit || 2000,
        memoryLimit: initialData.memoryLimit || 256,
        score: initialData.points || 10
      });

      if (initialData.hints && initialData.hints.length > 0) {
        setHints(initialData.hints.map((hint: any, index: number) => ({
          hintText: hint.hintText,
          pointsDeduction: hint.pointsDeduction || 0,
          isPublic: hint.isPublic !== undefined ? hint.isPublic : true,
          sequence: hint.sequence || index
        })));
      }
    }
  }, [initialData, isEditing]);

  // Helper functions
  const getAvailableDifficulties = () => {
    const levelConfig = exerciseData.fullExerciseData?.questionConfiguration?.levelType;
    const levels = exerciseData.fullExerciseData?.questionConfiguration;

    if (levelConfig !== 'levelBased') {
      return ['easy', 'medium', 'hard'];
    }

    const difficulties: string[] = [];
    if (levels.levelBased) {
      if (levels.levelBased.easy > 0) difficulties.push('easy');
      if (levels.levelBased.medium > 0) difficulties.push('medium');
      if (levels.levelBased.hard > 0) difficulties.push('hard');
    }

    return difficulties.length > 0 ? difficulties : ['easy', 'medium', 'hard'];
  };

  const addHint = () => {
    setHints([...hints, {
      hintText: '',
      pointsDeduction: 0,
      isPublic: true,
      sequence: hints.length
    }]);
  };

  const updateHint = (index: number, field: string, value: any) => {
    const newHints = [...hints];
    newHints[index] = { ...newHints[index], [field]: value };
    setHints(newHints);
  };

  const removeHint = (index: number) => {
    setHints(hints.filter((_, i) => i !== index));
  };

  const addConstraint = () => {
    setFormData({ ...formData, constraints: [...formData.constraints, ''] });
  };

  const updateConstraint = (index: number, value: string) => {
    const newConstraints = [...formData.constraints];
    newConstraints[index] = value;
    setFormData({ ...formData, constraints: newConstraints });
  };

  const removeConstraint = (index: number) => {
    if (formData.constraints.length > 1) {
      const newConstraints = formData.constraints.filter((_, i) => i !== index);
      setFormData({ ...formData, constraints: newConstraints });
    }
  };

  const handleExampleChange = (value: string) => {
    setFormData({ ...formData, example: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title.trim()) {
      alert('Please enter a question title');
      return;
    }

    if (!formData.description.trim()) {
      alert('Please enter a question description');
      return;
    }

    // Prepare hints array
    const preparedHints = [];
    if (formData.hint.trim()) {
      preparedHints.push({
        hintText: formData.hint.trim(),
        pointsDeduction: 0,
        isPublic: true,
        sequence: 0
      });
    }
    preparedHints.push(...hints);

    // Filter out empty constraints
    const validConstraints = formData.constraints.filter(c => c.trim() !== '');

    // Create question data matching backend expectations
    const questionData = {
      questionType: 'programming',
      title: formData.title.trim(),
      description: formData.description.trim(),
      difficulty: formData.difficulty as 'easy' | 'medium' | 'hard',
      score: formData.score,
      example: formData.example.trim() || undefined, // Use 'example' field
      constraints: validConstraints.length > 0 ? validConstraints : undefined,
      hints: preparedHints.length > 0 ? preparedHints : undefined,
      timeLimit: formData.timeLimit,
      memoryLimit: formData.memoryLimit,
      isActive: true,
      sequence: initialData?.sequence || 0,
      testCases: initialData?.testCases || [],
      solutions: initialData?.solutions || {
        startedCode: '',
        functionName: 'main',
        language: 'javascript'
      }
    };

    // Remove undefined fields
    Object.keys(questionData).forEach(key => {
      if (questionData[key] === undefined) {
        delete questionData[key];
      }
    });

    // Call onSave
    onSave(questionData);
    setShowToast(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col relative">

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-yellow-100 shadow">
              <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Edit Frontend Question' : 'Add Frontend Question'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span className="font-medium">{exerciseData.exerciseName}</span>
                <span className="text-gray-400">•</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  Frontend Module
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Question Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
                required
                placeholder="Enter question title"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Question Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the frontend problem. Include design requirements, functionality, and expected behavior."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-colors duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              >
                {getAvailableDifficulties().map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* SCORE FIELD - Show only if scoreType is "separateMarks" */}
            {exerciseData?.fullExerciseData?.scoreSettings?.scoreType === 'separateMarks' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Score *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
            )}

            {/* Example Section with TipTapEditor */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Example
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <TipTapEditor
                  value={formData.example}
                  onChange={handleExampleChange}
                  placeholder="Provide examples of expected behavior, design requirements, or sample code..."
                  minHeight="150px"
                  maxHeight="200px"
                  showToolbar={true}
                  editable={true}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use this editor to create rich examples with formatting, code blocks, images, and more.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Constraints
              </label>
              <div className="space-y-2">
                {formData.constraints.map((constraint, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={constraint}
                      onChange={(e) => updateConstraint(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., Must use React hooks, Must be responsive"
                    />
                    {formData.constraints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeConstraint(index)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addConstraint}
                  className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" /> Add Constraint
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hint (Optional)
              </label>
              <textarea
                value={formData.hint}
                onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                placeholder="Add a hint for students..."
              />
            </div>

            {/* ADDITIONAL HINTS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Additional Hints
                </label>
                <button
                  type="button"
                  onClick={addHint}
                  className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" /> Add Hint
                </button>
              </div>
              <div className="space-y-3">
                {hints.map((hint, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Hint {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeHint(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={hint.hintText}
                      onChange={(e) => updateHint(index, 'hintText', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                      placeholder="Hint text..."
                    />
                    <div className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <span className="text-gray-600">Points Deduction:</span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={hint.pointsDeduction}
                          onChange={(e) => updateHint(index, 'pointsDeduction', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hint.isPublic}
                          onChange={(e) => updateHint(index, 'isPublic', e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-gray-600">Public</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gradient-to-r from-gray-50 to-white sticky bottom-0 z-10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSaving ? 'animate-pulse bg-yellow-500' : 'bg-yellow-500'}`}></div>
                <div>
                  <span className="font-semibold">Module:</span> Frontend
                  {isSaving && <span className="ml-2 text-yellow-600 font-medium">(Saving...)</span>}
                </div>
              </div>

              {isSaving && (
                <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700">Processing...</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className={`relative px-6 py-2.5 text-sm text-white rounded-lg flex items-center gap-2 shadow transition-all duration-200 min-w-[140px] justify-center ${isSaving
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 active:scale-95'
                  }`}
              >
                {isSaving && (
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg opacity-70"></div>
                )}
                <div className="flex items-center gap-2 relative z-10">
                  {isSaving ? (
                    <>
                      <div className="relative">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <span className="whitespace-nowrap">{isEditing ? 'Updating...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span className="whitespace-nowrap">{isEditing ? 'Update Question' : 'Save Question'}</span>
                    </>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Progress bar when saving */}
          {isSaving && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-1.5 rounded-full animate-pulse"
                  style={{ width: '100%' }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{saveMessage}</span>
                <span>Please do not close this window</span>
              </div>
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-5 rounded-xl shadow-2xl flex items-center gap-4 border border-green-500">
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-lg">Success!</h4>
                <p className="text-sm opacity-90">{isEditing ? 'Question updated' : 'Question added'} successfully.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrontendQuestionForm;