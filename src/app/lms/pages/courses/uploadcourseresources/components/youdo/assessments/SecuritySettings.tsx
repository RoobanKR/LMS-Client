// SecuritySettings.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  Shield, Copy, Move, MonitorSmartphone, Eye, Camera,
  AlertTriangle, Clock, Fingerprint, Key, Wifi, Users,
  ChevronDown, ChevronUp, Check, AlertCircle, Info,
  Lock, Unlock, MousePointer, Clipboard, FileText,
  Globe, Activity, Brain, Smartphone, Laptop, Tablet,
  Code2,
  RefreshCw,
  ArrowLeft,
  Printer,
  Settings2,
  Mic,
  Video,  // Add this for screen recording icon
  StopCircle, // Alternative icon
} from 'lucide-react';
import { D } from './constants';
import { InfoTooltip, OToggle } from './UIComponents';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SecuritySettingsData {
  // Basic restrictions
  preventCopyPaste: boolean;
  preventRightClick: boolean;
  preventPrinting: boolean;
  preventScreenshot: boolean;
  preventScreenRecording: boolean; // NEW: Screen recording prevention
  
  // Browser restrictions
  requireFullscreen: boolean;
  preventTabSwitch: boolean;
  preventBrowserClose: boolean;
  preventDevTools: boolean;
  
  // Navigation restrictions
  preventBackNavigation: boolean;
  preventRefresh: boolean;
  preventUrlChange: boolean;
  
  // Time restrictions
  autoSubmitOnTimeout: boolean;
  warnBeforeTimeout: boolean;
  warningSeconds: number;
  
  // Identity verification
  enableFaceVerification: boolean;
  enableIdVerification: boolean;
  enableVoiceVerification: boolean;
  captureIntervalSeconds: number;
  
  // Network restrictions
  blockOtherIPs: boolean;
  allowedIPs: string[];
  singleDeviceOnly: boolean;
  
  // Question restrictions
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  randomizeQuestionOrder: boolean;
  preventQuestionBacktrack: boolean;

  
  // Additional security
  sessionTimeoutMinutes: number;
  maxAttempts: number;
  graceAttempts: number;
  cooldownMinutes: number;
}

interface SecuritySettingsProps {
  value: SecuritySettingsData;
  onChange: (data: SecuritySettingsData) => void;
  disabled?: boolean;
}

// ─── Section Components ───────────────────────────────────────────────────────
const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}> = ({ title, icon, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: D.border, background: D.bg }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        style={{ borderBottom: expanded ? `1px solid ${D.border}` : 'none' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: D.orangeLight, color: D.orange }}>
            {icon}
          </div>
          <span className="text-sm font-bold" style={{ color: D.textMain }}>{title}</span>
        </div>
        <div className="text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 space-y-3" style={{ background: '#fafafa' }}>
          {children}
        </div>
      )}
    </div>
  );
};

const SettingRow: React.FC<{
  label: string;
  description?: string;
  icon?: React.ReactNode;
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  danger?: boolean;
  info?: string;
  children?: React.ReactNode;
}> = ({ label, description, icon, enabled, onChange, disabled, danger, info, children }) => (
  <div className="flex items-start justify-between py-2 border-b last:border-b-0" style={{ borderColor: D.border }}>
    <div className="flex items-start gap-3 flex-1 mr-4">
      {icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" 
          style={{ background: danger ? 'rgba(239,68,68,0.1)' : D.orangeLight, color: danger ? '#ef4444' : D.orange }}>
          {icon}
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold" style={{ color: danger ? '#ef4444' : D.textMain }}>{label}</span>
          {info && <InfoTooltip content={info} side="top" />}
        </div>
        {description && <p className="text-xs mt-0.5" style={{ color: D.textMuted }}>{description}</p>}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
    <OToggle enabled={enabled} onChange={onChange} disabled={disabled} />
  </div>
);

const NumberInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  disabled?: boolean;
}> = ({ value, onChange, min = 1, max = 60, label, unit, disabled }) => (
  <div className="flex items-center gap-2">
    {label && <span className="text-xs font-medium" style={{ color: D.textSub }}>{label}</span>}
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
      disabled={disabled}
      className="w-20 px-2 py-1 text-sm rounded-lg border text-center"
      style={{ borderColor: D.border, background: disabled ? D.surface : D.bg, color: D.textMain }}
      min={min}
      max={max}
    />
    {unit && <span className="text-xs" style={{ color: D.textMuted }}>{unit}</span>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ value, onChange, disabled = false }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'proctoring' | 'advanced'>('basic');

  const updateField = useCallback(<K extends keyof SecuritySettingsData>(field: K, newValue: SecuritySettingsData[K]) => {
    onChange({ ...value, [field]: newValue });
  }, [value, onChange]);

  const tabs = [
    { id: 'basic', label: 'Basic Security', icon: <Shield size={14} /> },
    { id: 'advanced', label: 'Advanced', icon: <Settings2 size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: D.border }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all"
            style={{
              color: activeTab === tab.id ? D.orange : D.textMuted,
              borderBottom: activeTab === tab.id ? `2px solid ${D.orange}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Basic Security Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-3">
          <SettingRow
            label="Prevent Copy & Paste"
            description="Students cannot copy text from or paste into the test"
            icon={<Copy size={16} />}
            enabled={value.preventCopyPaste}
            onChange={(v) => updateField('preventCopyPaste', v)}
            disabled={disabled}
            info="Prevents Ctrl+C, Ctrl+V, right-click copy, and text selection"
          />
          
          <SettingRow
            label="Prevent Right Click"
            description="Disable context menu on right-click"
            icon={<MousePointer size={16} />}
            enabled={value.preventRightClick}
            onChange={(v) => updateField('preventRightClick', v)}
            disabled={disabled}
          />
          
          <SettingRow
            label="Prevent Printing"
            description="Disable print functionality (Ctrl+P)"
            icon={<Printer size={16} />}
            enabled={value.preventPrinting}
            onChange={(v) => updateField('preventPrinting', v)}
            disabled={disabled}
          />
          
          <SettingRow
            label="Prevent Screenshots"
            description="Attempt to detect and block screenshot attempts"
            icon={<Camera size={16} />}
            enabled={value.preventScreenshot}
            onChange={(v) => updateField('preventScreenshot', v)}
            disabled={disabled}
            info="Detects PrintScreen key and common screenshot shortcuts"
          />
          
          {/* NEW: Screen Recording Prevention */}
          <SettingRow
            label="Prevent Screen Recording"
            description="Detect and block screen recording attempts"
            icon={<Video size={16} />}
            enabled={value.preventScreenRecording}
            onChange={(v) => updateField('preventScreenRecording', v)}
            disabled={disabled}
            info="Detects screen recording software, OBS, Zoom recording, and browser-based recording APIs. Shows warning if recording is detected."
          />
          
          <SettingRow
            label="Require Fullscreen Mode"
            description="Test must be taken in fullscreen mode"
            icon={<MonitorSmartphone size={16} />}
            enabled={value.requireFullscreen}
            onChange={(v) => updateField('requireFullscreen', v)}
            disabled={disabled}
            info="Exits fullscreen triggers a warning and may auto-submit"
          />
          
          <SettingRow
            label="Prevent Tab Switching"
            description="Detect and warn when student switches tabs"
            icon={<Move size={16} />}
            enabled={value.preventTabSwitch}
            onChange={(v) => updateField('preventTabSwitch', v)}
            disabled={disabled}
            info="Uses Page Visibility API to detect tab changes"
          />
          
          <SettingRow
            label="Prevent Browser Close"
            description="Warn before closing the test window"
            icon={<AlertTriangle size={16} />}
            enabled={value.preventBrowserClose}
            onChange={(v) => updateField('preventBrowserClose', v)}
            disabled={disabled}
          />
          
          <SettingRow
            label="Prevent Back Navigation"
            description="Disable browser back button during test"
            icon={<ArrowLeft size={16} />}
            enabled={value.preventBackNavigation}
            onChange={(v) => updateField('preventBackNavigation', v)}
            disabled={disabled}
          />
          
          <SettingRow
            label="Prevent Page Refresh"
            description="Warn or block page refresh attempts"
            icon={<RefreshCw size={16} />}
            enabled={value.preventRefresh}
            onChange={(v) => updateField('preventRefresh', v)}
            disabled={disabled}
          />
          
          <SettingRow
            label="Prevent Developer Tools"
            description="Detect and block DevTools opening"
            icon={<Code2 size={16} />}
            enabled={value.preventDevTools}
            onChange={(v) => updateField('preventDevTools', v)}
            disabled={disabled}
            info="Detects F12, Ctrl+Shift+I, and right-click inspect"
          />
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-3">
          <SettingRow
            label="Single Device Only"
            description="Student cannot switch devices during test"
            icon={<Laptop size={16} />}
            enabled={value.singleDeviceOnly}
            onChange={(v) => updateField('singleDeviceOnly', v)}
            disabled={disabled}
          />
          
          <SettingRow
            label="Block Other IPs"
            description="Only allow test from specific IP addresses"
            icon={<Globe size={16} />}
            enabled={value.blockOtherIPs}
            onChange={(v) => updateField('blockOtherIPs', v)}
            disabled={disabled}
          >
            {value.blockOtherIPs && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Enter allowed IPs (comma separated)"
                  value={value.allowedIPs.join(', ')}
                  onChange={(e) => updateField('allowedIPs', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border"
                  style={{ borderColor: D.border, background: D.bg }}
                  disabled={disabled}
                />
              </div>
            )}
          </SettingRow>
          
          <SettingRow
            label="Auto-submit on Timeout"
            description="Automatically submit when time runs out"
            icon={<Clock size={16} />}
            enabled={value.autoSubmitOnTimeout}
            onChange={(v) => updateField('autoSubmitOnTimeout', v)}
            disabled={disabled}
          />
          
          <SettingRow
            label="Warning Before Timeout"
            description="Show warning before time expires"
            icon={<AlertCircle size={16} />}
            enabled={value.warnBeforeTimeout}
            onChange={(v) => updateField('warnBeforeTimeout', v)}
            disabled={disabled}
          >
            {value.warnBeforeTimeout && (
              <div className="mt-2">
                <NumberInput
                  value={value.warningSeconds}
                  onChange={(v) => updateField('warningSeconds', v)}
                  min={10}
                  max={300}
                  label="Warning at:"
                  unit="seconds before end"
                  disabled={disabled}
                />
              </div>
            )}
          </SettingRow>
          
          <SettingRow
            label="Session Timeout"
            description="Auto-logout after inactivity"
            icon={<Activity size={16} />}
            enabled={value.sessionTimeoutMinutes > 0}
            onChange={(v) => updateField('sessionTimeoutMinutes', v ? 30 : 0)}
            disabled={disabled}
          >
            {value.sessionTimeoutMinutes > 0 && (
              <div className="mt-2">
                <NumberInput
                  value={value.sessionTimeoutMinutes}
                  onChange={(v) => updateField('sessionTimeoutMinutes', v)}
                  min={5}
                  max={120}
                  label="Timeout after:"
                  unit="minutes"
                  disabled={disabled}
                />
              </div>
            )}
          </SettingRow>
          
          <SettingRow
            label="Attempt Limits"
            description="Restrict number of attempts"
            icon={<Users size={16} />}
            enabled={value.maxAttempts > 0}
            onChange={(v) => updateField('maxAttempts', v ? 1 : 0)}
            disabled={disabled}
          >
            {value.maxAttempts > 0 && (
              <div className="space-y-2 mt-2 pl-4">
                <NumberInput
                  value={value.maxAttempts}
                  onChange={(v) => updateField('maxAttempts', v)}
                  min={1}
                  max={10}
                  label="Max attempts:"
                  unit="times"
                  disabled={disabled}
                />
                <NumberInput
                  value={value.graceAttempts}
                  onChange={(v) => updateField('graceAttempts', v)}
                  min={0}
                  max={5}
                  label="Grace attempts:"
                  unit="extra attempts"
                  disabled={disabled}
                />
                <NumberInput
                  value={value.cooldownMinutes}
                  onChange={(v) => updateField('cooldownMinutes', v)}
                  min={0}
                  max={1440}
                  label="Cooldown between attempts:"
                  unit="minutes"
                  disabled={disabled}
                />
              </div>
            )}
          </SettingRow>
          
          <SettingRow
            label="Question Settings"
            description="Configure question display behavior"
            icon={<FileText size={16} />}
            enabled={true}
            onChange={() => {}}
            disabled={true}
          >
            <div className="space-y-2 mt-2">
              <SettingRow
                label="Shuffle Questions"
                description="Randomize question order for each student"
                enabled={value.shuffleQuestions}
                onChange={(v) => updateField('shuffleQuestions', v)}
                disabled={disabled}
              />
              <SettingRow
                label="Shuffle Options"
                description="Randomize answer options order"
                enabled={value.shuffleOptions}
                onChange={(v) => updateField('shuffleOptions', v)}
                disabled={disabled}
              />
              <SettingRow
                label="Prevent Question Backtrack"
                description="Cannot return to previous questions"
                enabled={value.preventQuestionBacktrack}
                onChange={(v) => updateField('preventQuestionBacktrack', v)}
                disabled={disabled}
              />
            </div>
          </SettingRow>
        </div>
      )}

      {/* Security Level Indicator */}
      <div className="mt-4 p-3 rounded-lg" style={{ background: D.orangeLight, border: `1px solid ${D.orange}25` }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} style={{ color: D.orange }} />
          <span className="text-xs font-bold" style={{ color: D.orange }}>Security Score</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: D.border }}>
            {(() => {
              let score = 0;
              let total = 0;
              
              const check = (condition: boolean, weight: number) => {
                total += weight;
                if (condition) score += weight;
              };
              
              check(value.preventCopyPaste, 5);
              check(value.preventRightClick, 3);
              check(value.preventPrinting, 3);
              check(value.preventScreenRecording, 7); // Added weight for screen recording
              check(value.requireFullscreen, 8);
              check(value.preventTabSwitch, 10);
              check(value.preventDevTools, 8);
              check(value.singleDeviceOnly, 8);
              check(value.maxAttempts > 0, 5);
              check(value.sessionTimeoutMinutes > 0, 5);
              
              const percentage = total > 0 ? (score / total) * 100 : 0;
              const color = percentage >= 70 ? D.emerald : percentage >= 40 ? D.amber : D.red;
              
              return <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: color }} />;
            })()}
          </div>
          <span className="text-xs font-bold" style={{ color: D.textMain }}>
            {Math.round((() => {
              let score = 0, total = 0;
              const check = (condition: boolean, weight: number) => { total += weight; if (condition) score += weight; };
              check(value.preventCopyPaste, 5); check(value.preventRightClick, 3); check(value.preventPrinting, 3);
              check(value.preventScreenRecording, 7); // Added weight for screen recording
              check(value.requireFullscreen, 8); check(value.preventTabSwitch, 10); check(value.preventDevTools, 8);
              check(value.singleDeviceOnly, 8); check(value.maxAttempts > 0, 5); check(value.sessionTimeoutMinutes > 0, 5);
              return total > 0 ? (score / total) * 100 : 0;
            })())}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Default values
export const defaultSecuritySettings: SecuritySettingsData = {
  preventCopyPaste: true,
  preventRightClick: true,
  preventPrinting: true,
  preventScreenshot: true,
  preventScreenRecording: true, // NEW: Default enabled
  requireFullscreen: true,
  preventTabSwitch: true,
  preventBrowserClose: true,
  preventDevTools: true,
  preventBackNavigation: true,
  preventRefresh: true,
  preventUrlChange: false,
  autoSubmitOnTimeout: true,
  warnBeforeTimeout: true,
  warningSeconds: 30,
  enableFaceVerification: false,
  enableIdVerification: false,
  enableVoiceVerification: false,
  captureIntervalSeconds: 60,
  blockOtherIPs: false,
  allowedIPs: [],
  singleDeviceOnly: false,
  shuffleQuestions: true,
  shuffleOptions: true,
  randomizeQuestionOrder: false,
  preventQuestionBacktrack: false,
  sessionTimeoutMinutes: 30,
  maxAttempts: 1,
  graceAttempts: 0,
  cooldownMinutes: 30,
};