// components/TestConfigurationSection.tsx
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Monitor, Layout, Database } from "lucide-react";

export interface TestConfiguration {
  coreProgram: string[];
  frontend: string[];
  database: string[];
}

interface TestConfigurationSectionProps {
  testConfiguration: TestConfiguration;
  onChange: (config: TestConfiguration) => void;
  availableLanguages?: TestConfiguration;
}

const languageOptions = {
  coreProgram: [
    { value: 'c', label: 'C', icon: '🔵' },
    { value: 'cpp', label: 'C++', icon: '🔷' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'python', label: 'Python', icon: '🐍' }
  ],
  frontend: [
    { value: 'html', label: 'HTML', icon: '🌐' },
    { value: 'css', label: 'CSS', icon: '🎨' },
    { value: 'js', label: 'JavaScript', icon: '🟡' },
    { value: 'react', label: 'React', icon: '⚛️' },
    { value: 'next', label: 'Next.js', icon: '▲' }
  ],
  database: [
    { value: 'mongodb', label: 'MongoDB', icon: '🍃' },
    { value: 'mysql', label: 'MySQL', icon: '🐬' }
  ]
};

const TestConfigurationSection: React.FC<TestConfigurationSectionProps> = ({
  testConfiguration,
  onChange,
  availableLanguages
}) => {
  // Use a unique key to force re-render when testConfiguration changes
  const [localConfig, setLocalConfig] = useState<TestConfiguration>({
    coreProgram: [],
    frontend: [],
    database: []
  });

  // Update local config when testConfiguration prop changes
  useEffect(() => {
    console.log('TestConfigurationSection received new config:', testConfiguration);
    const newConfig = {
      coreProgram: testConfiguration?.coreProgram ? [...testConfiguration.coreProgram] : [],
      frontend: testConfiguration?.frontend ? [...testConfiguration.frontend] : [],
      database: testConfiguration?.database ? [...testConfiguration.database] : []
    };
    setLocalConfig(newConfig);
  }, [testConfiguration]);

  const handleLanguageChange = (category: 'coreProgram' | 'frontend' | 'database', value: string) => {
    const current = [...localConfig[category]];
    let updated: string[];
    
    if (current.includes(value)) {
      updated = current.filter(lang => lang !== value);
    } else {
      updated = [...current, value];
    }

    const newConfig = { ...localConfig, [category]: updated };
    console.log(`Toggling ${category}: ${value} - was ${current.includes(value) ? 'checked' : 'unchecked'}, now ${updated.includes(value) ? 'checked' : 'unchecked'}`);
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const isSelected = (category: 'coreProgram' | 'frontend' | 'database', value: string): boolean => {
    return localConfig[category]?.includes(value) || false;
  };

  const visibleOptions = {
    coreProgram: availableLanguages?.coreProgram && availableLanguages.coreProgram.length > 0
      ? languageOptions.coreProgram.filter(l => availableLanguages.coreProgram?.includes(l.value))
      : languageOptions.coreProgram,
    frontend: availableLanguages?.frontend && availableLanguages.frontend.length > 0
      ? languageOptions.frontend.filter(l => availableLanguages.frontend?.includes(l.value))
      : languageOptions.frontend,
    database: availableLanguages?.database && availableLanguages.database.length > 0
      ? languageOptions.database.filter(l => availableLanguages.database?.includes(l.value))
      : languageOptions.database,
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans mb-4">
        Skill Set
      </h3>

      <div className="space-y-5">
        {/* Core Programming Languages */}
        {visibleOptions.coreProgram.length > 0 && (
          <div className="space-y-2 border-b border-slate-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="h-4 w-4 text-purple-500" />
              <Label className="text-sm font-semibold text-slate-700 dark:text-gray-300 font-sans">
                Core Programming Languages
              </Label>
            </div>
            <div className="flex flex-wrap gap-2 pl-6">
              {visibleOptions.coreProgram.map((lang) => {
                const checked = isSelected('coreProgram', lang.value);
                return (
                  <label
                    key={lang.value}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 border ${
                      checked
                        ? 'bg-purple-50 border-purple-400 text-purple-700'
                        : 'bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-purple-50 hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleLanguageChange('coreProgram', lang.value)}
                      className="w-3.5 h-3.5 rounded accent-purple-600 cursor-pointer"
                    />
                    <span>{lang.icon}</span>
                    {lang.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Frontend Technologies */}
        {visibleOptions.frontend.length > 0 && (
          <div className="space-y-2 border-b border-slate-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Layout className="h-4 w-4 text-blue-500" />
              <Label className="text-sm font-semibold text-slate-700 dark:text-gray-300 font-sans">
                Frontend Technologies
              </Label>
            </div>
            <div className="flex flex-wrap gap-2 pl-6">
              {visibleOptions.frontend.map((lang) => {
                const checked = isSelected('frontend', lang.value);
                return (
                  <label
                    key={lang.value}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 border ${
                      checked
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleLanguageChange('frontend', lang.value)}
                      className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                    />
                    <span>{lang.icon}</span>
                    {lang.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Database Technologies */}
        {visibleOptions.database.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-orange-500" />
              <Label className="text-sm font-semibold text-slate-700 dark:text-gray-300 font-sans">
                Database Technologies
              </Label>
            </div>
            <div className="flex flex-wrap gap-2 pl-6">
              {visibleOptions.database.map((lang) => {
                const checked = isSelected('database', lang.value);
                return (
                  <label
                    key={lang.value}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 border ${
                      checked
                        ? 'bg-orange-50 border-orange-400 text-orange-700'
                        : 'bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-orange-50 hover:border-orange-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleLanguageChange('database', lang.value)}
                      className="w-3.5 h-3.5 rounded accent-orange-600 cursor-pointer"
                    />
                    <span>{lang.icon}</span>
                    {lang.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestConfigurationSection;