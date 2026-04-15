import React, { useState } from 'react';
import {
  Film,
  FileInput,
  FileText,
  Link,
  Sparkles,
  User,
  Users,
  UserCheck,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileResource {
  enabled: boolean;
  maxSize: number;
  allowedFormats?: string[];
  aiChat?: boolean;
  aiSummary?: boolean;
}

interface SimpleResource {
  enabled: boolean;
}

interface ResourceConfigType {
  video?: FileResource;
  ppt?: FileResource;
  pdf?: FileResource;
  url?: SimpleResource;
  aiChat?: SimpleResource;
  aiSummary?: SimpleResource;
  notes?: SimpleResource;
}

interface PedagogyResources {
  iDo: ResourceConfigType;
  weDo: ResourceConfigType;
  youDo: ResourceConfigType;
}

interface ValidationErrors {
  resourceType?: string;
}

interface ResourceTypeSectionProps {
  formData: {
    iDo: string[];
    weDo: string[];
    youDo: string[];
    resourcesType: PedagogyResources;
    aiChatGlobal: boolean;
  };
  setFormData: (updater: (prev: any) => any) => void;
  validationErrors: ValidationErrors;
  setValidationErrors: (updater: (prev: any) => any) => void;
}

type TabKey = 'iDo' | 'weDo' | 'youDo';

// ─── Small Toggle ─────────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  color?: string;
}> = ({ checked, onChange, color = '#7F77DD' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    style={{
      position: 'relative',
      display: 'inline-flex',
      width: 36,
      height: 20,
      borderRadius: 10,
      background: checked ? color : '#D1D5DB',
      border: 'none',
      cursor: 'pointer',
      transition: 'background 0.15s',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 2,
        left: checked ? 18 : 2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    />
  </button>
);

// ─── Status Pill ─────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 500,
      padding: '2px 7px',
      borderRadius: 8,
      background: active ? '#EEEDFE' : 'var(--color-background-secondary, #F5F5F5)',
      color: active ? '#534AB7' : '#9CA3AF',
      border: `0.5px solid ${active ? '#AFA9EC' : 'transparent'}`,
      transition: 'all 0.15s',
    }}
  >
    {active ? 'On' : 'Off'}
  </span>
);

// ─── AI Sub-row ───────────────────────────────────────────────────────────────

const AISubRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}> = ({ label, description, checked, onChange }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderTop: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
    }}
  >
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Sparkles size={11} color="#EF9F27" />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{description}</span>
    </div>
    <Toggle checked={checked} onChange={onChange} color="#EF9F27" />
  </div>
);

// ─── File Resource Row (Video / PPT / PDF) ────────────────────────────────────

const FileResourceRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  iconBg: string;
  resource: FileResource | undefined;
  onToggle: () => void;
  onMaxSizeChange: (val: number) => void;
  onAiChatToggle: () => void;
  onAiSummaryToggle: () => void;
}> = ({
  icon, label, description, iconBg,
  resource,
  onToggle, onMaxSizeChange, onAiChatToggle, onAiSummaryToggle,
}) => {
  const enabled = resource?.enabled ?? false;
  const [expanded, setExpanded] = useState(false);

  // Auto-open when enabled, auto-close when disabled
  const prevEnabled = React.useRef(enabled);
  React.useEffect(() => {
    if (enabled && !prevEnabled.current) {
      setExpanded(true);
    }
    if (!enabled && prevEnabled.current) {
      setExpanded(false);
    }
    prevEnabled.current = enabled;
  }, [enabled]);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (enabled) setExpanded(v => !v);
  };

  return (
    <div style={{ borderBottom: '0.5px solid var(--color-border-tertiary, #E5E7EB)' }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          cursor: enabled ? 'pointer' : 'default',
          transition: 'background 0.1s',
          background: expanded ? 'var(--color-background-secondary, #F9FAFB)' : 'transparent',
        }}
        onClick={handleExpandClick}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30, height: 30, borderRadius: 7,
              background: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{description}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusPill active={enabled} />
          <Toggle checked={enabled} onChange={onToggle} />
          {enabled && (
            <ChevronDown
              size={14}
              style={{
                color: 'var(--color-text-secondary)',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          )}
        </div>
      </div>

      {/* Expanded config */}
      {enabled && expanded && (
        <div
          style={{
            padding: '10px 14px 10px 54px',
            background: 'var(--color-background-secondary, #F9FAFB)',
            borderTop: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
          }}
        >
          {/* File size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 90 }}>Max file size</span>
            <Input
              type="number"
              min={0.5}
              max={100}
              step={0.5}
              value={resource?.maxSize ?? 10}
              onChange={e => onMaxSizeChange(parseFloat(e.target.value) || 10)}
              style={{ width: 70, height: 28, fontSize: 12, padding: '0 8px' }}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>MB</span>
          </div>

          <AISubRow
            label="AI Chat"
            description={`Enable AI assistant for ${label}`}
            checked={resource?.aiChat ?? false}
            onChange={onAiChatToggle}
          />
          <AISubRow
            label="AI Summary"
            description={`Auto-generate summaries for ${label}`}
            checked={resource?.aiSummary ?? false}
            onChange={onAiSummaryToggle}
          />
        </div>
      )}
    </div>
  );
};

// ─── Simple Resource Row (URL / Notes / AI Chat / AI Summary) ─────────────────

const SimpleResourceRow: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}> = ({ icon, iconBg, label, description, enabled, onToggle }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      borderBottom: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 30, height: 30, borderRadius: 7,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{description}</div>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <StatusPill active={enabled} />
      <Toggle checked={enabled} onChange={onToggle} />
    </div>
  </div>
);

// ─── Tab Badge ────────────────────────────────────────────────────────────────

const TabBadge: React.FC<{ count: number }> = ({ count }) => (
  <span
    style={{
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 8,
      fontWeight: 500,
      background: count > 0 ? '#EEEDFE' : 'var(--color-background-secondary, #F5F5F5)',
      color: count > 0 ? '#534AB7' : '#9CA3AF',
      border: `0.5px solid ${count > 0 ? '#AFA9EC' : 'transparent'}`,
      transition: 'all 0.15s',
    }}
  >
    {count} active
  </span>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countActive(cfg: ResourceConfigType): number {
  return Object.values(cfg).filter(v => v?.enabled).length;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ResourceTypeSection: React.FC<ResourceTypeSectionProps> = ({
  formData,
  setFormData,
  validationErrors,
  setValidationErrors,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('iDo');

  const rt = formData.resourcesType;

  // Generic updater for iDo file resources
  const updateIDoFile = (
    key: 'video' | 'ppt' | 'pdf',
    patch: Partial<FileResource>
  ) => {
    setFormData((prev: any) => ({
      ...prev,
      resourcesType: {
        ...prev.resourcesType,
        iDo: {
          ...prev.resourcesType.iDo,
          [key]: { ...prev.resourcesType.iDo[key], ...patch },
        },
      },
    }));
    setValidationErrors((prev: any) => ({ ...prev, resourceType: undefined }));
  };

  // Generic updater for simple resources
  const updateSimple = (
    section: 'iDo' | 'weDo' | 'youDo',
    key: 'url' | 'notes' | 'aiChat' | 'aiSummary',
    enabled: boolean
  ) => {
    setFormData((prev: any) => ({
      ...prev,
      resourcesType: {
        ...prev.resourcesType,
        [section]: {
          ...prev.resourcesType[section],
          [key]: { enabled },
        },
      },
    }));
    setValidationErrors((prev: any) => ({ ...prev, resourceType: undefined }));
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; color: string; dotColor: string }[] = [
    { key: 'iDo', label: 'I Do', icon: <User size={13} />, color: '#378ADD', dotColor: '#378ADD' },
    { key: 'weDo', label: 'We Do', icon: <Users size={13} />, color: '#1D9E75', dotColor: '#1D9E75' },
    { key: 'youDo', label: 'You Do', icon: <UserCheck size={13} />, color: '#7F77DD', dotColor: '#7F77DD' },
  ];

  const idoCount = countActive(rt.iDo);
  const wedoCount = countActive(rt.weDo);
  const youdoCount = countActive(rt.youDo);
  const counts: Record<TabKey, number> = { iDo: idoCount, weDo: wedoCount, youDo: youdoCount };

  return (
    <div
      style={{
        background: 'var(--color-background-primary, #fff)',
        border: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Section Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
          background: 'var(--color-background-secondary, #F9FAFB)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <FileText size={15} color="#7F77DD" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Resource Type
          </span>
          <span
            style={{
              fontSize: 10,
              background: '#FCEBEB',
              color: '#A32D2D',
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            Required
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            background: 'var(--color-background-primary, #fff)',
            border: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
            borderRadius: 6,
            padding: '4px 9px',
          }}
        >
          <Info size={11} />
          Configure resources per pedagogy section
        </div>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
          background: 'var(--color-background-primary, #fff)',
        }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${isActive ? tab.dotColor : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: isActive ? tab.dotColor : 'var(--color-border-tertiary, #D1D5DB)',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
              />
              {tab.label}
              <TabBadge count={counts[tab.key]} />
            </button>
          );
        })}
      </div>

      {/* Panel Content */}
      <div style={{ padding: 14 }}>

        {/* ── I DO PANEL ─────────────────────────────────────── */}
        {activeTab === 'iDo' && (
          <>
            {formData.iDo.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                <User size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <div>Select I Do pedagogy methods first to configure resources</div>
              </div>
            ) : (
              <div
                style={{
                  border: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <FileResourceRow
                  icon={<Film size={14} color="#7F77DD" />}
                  iconBg="#EEEDFE"
                  label="Video"
                  description="Upload lecture or tutorial videos"
                  resource={rt.iDo.video}
                  onToggle={() => updateIDoFile('video', { enabled: !rt.iDo.video?.enabled })}
                  onMaxSizeChange={val => updateIDoFile('video', { maxSize: val })}
                  onAiChatToggle={() => updateIDoFile('video', { aiChat: !rt.iDo.video?.aiChat })}
                  onAiSummaryToggle={() => updateIDoFile('video', { aiSummary: !rt.iDo.video?.aiSummary })}
                />
                <FileResourceRow
                  icon={<FileInput size={14} color="#E24B4A" />}
                  iconBg="#FCEBEB"
                  label="PPT"
                  description="Upload presentation slides"
                  resource={rt.iDo.ppt}
                  onToggle={() => updateIDoFile('ppt', { enabled: !rt.iDo.ppt?.enabled })}
                  onMaxSizeChange={val => updateIDoFile('ppt', { maxSize: val })}
                  onAiChatToggle={() => updateIDoFile('ppt', { aiChat: !rt.iDo.ppt?.aiChat })}
                  onAiSummaryToggle={() => updateIDoFile('ppt', { aiSummary: !rt.iDo.ppt?.aiSummary })}
                />
                <FileResourceRow
                  icon={<FileText size={14} color="#378ADD" />}
                  iconBg="#E6F1FB"
                  label="PDF"
                  description="Upload PDF documents"
                  resource={rt.iDo.pdf}
                  onToggle={() => updateIDoFile('pdf', { enabled: !rt.iDo.pdf?.enabled })}
                  onMaxSizeChange={val => updateIDoFile('pdf', { maxSize: val })}
                  onAiChatToggle={() => updateIDoFile('pdf', { aiChat: !rt.iDo.pdf?.aiChat })}
                  onAiSummaryToggle={() => updateIDoFile('pdf', { aiSummary: !rt.iDo.pdf?.aiSummary })}
                />
                <SimpleResourceRow
                  icon={<Link size={14} color="#1D9E75" />}
                  iconBg="#E1F5EE"
                  label="URL / Link"
                  description="Share external web resources"
                  enabled={rt.iDo.url?.enabled ?? false}
                  onToggle={() => updateSimple('iDo', 'url', !rt.iDo.url?.enabled)}
                />
                <div style={{ borderBottom: 'none' }}>
                  <SimpleResourceRow
                    icon={<FileText size={14} color="#639922" />}
                    iconBg="#EAF3DE"
                    label="Notes"
                    description="Downloadable study notes for students"
                    enabled={rt.iDo.notes?.enabled ?? false}
                    onToggle={() => updateSimple('iDo', 'notes', !rt.iDo.notes?.enabled)}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── WE DO PANEL ────────────────────────────────────── */}
        {activeTab === 'weDo' && (
          <>
            {formData.weDo.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                <Users size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <div>Select We Do pedagogy methods first to configure resources</div>
              </div>
            ) : (
              <div
                style={{
                  border: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <SimpleResourceRow
                  icon={<Sparkles size={14} color="#EF9F27" />}
                  iconBg="#FAEEDA"
                  label="AI Chat"
                  description="AI-powered assistant for guided practice"
                  enabled={rt.weDo.aiChat?.enabled ?? false}
                  onToggle={() => updateSimple('weDo', 'aiChat', !rt.weDo.aiChat?.enabled)}
                />
                <SimpleResourceRow
                  icon={<Sparkles size={14} color="#EF9F27" />}
                  iconBg="#FAEEDA"
                  label="AI Summary"
                  description="Auto-generated summaries for practice content"
                  enabled={rt.weDo.aiSummary?.enabled ?? false}
                  onToggle={() => updateSimple('weDo', 'aiSummary', !rt.weDo.aiSummary?.enabled)}
                />
                <div style={{ borderBottom: 'none' }}>
                  <SimpleResourceRow
                    icon={<FileText size={14} color="#639922" />}
                    iconBg="#EAF3DE"
                    label="Notes"
                    description="Downloadable notes for guided practice"
                    enabled={rt.weDo.notes?.enabled ?? false}
                    onToggle={() => updateSimple('weDo', 'notes', !rt.weDo.notes?.enabled)}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── YOU DO PANEL ────────────────────────────────────── */}
        {activeTab === 'youDo' && (
          <>
            {formData.youDo.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                <UserCheck size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <div>Select You Do pedagogy methods first to configure resources</div>
              </div>
            ) : (
              <div
                style={{
                  border: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <SimpleResourceRow
                  icon={<Sparkles size={14} color="#EF9F27" />}
                  iconBg="#FAEEDA"
                  label="AI Chat"
                  description="AI-powered assistant for independent practice"
                  enabled={rt.youDo.aiChat?.enabled ?? false}
                  onToggle={() => updateSimple('youDo', 'aiChat', !rt.youDo.aiChat?.enabled)}
                />
                <SimpleResourceRow
                  icon={<Sparkles size={14} color="#EF9F27" />}
                  iconBg="#FAEEDA"
                  label="AI Summary"
                  description="Auto-generated summaries for independent content"
                  enabled={rt.youDo.aiSummary?.enabled ?? false}
                  onToggle={() => updateSimple('youDo', 'aiSummary', !rt.youDo.aiSummary?.enabled)}
                />
                <div style={{ borderBottom: 'none' }}>
                  <SimpleResourceRow
                    icon={<FileText size={14} color="#639922" />}
                    iconBg="#EAF3DE"
                    label="Notes"
                    description="Downloadable notes for independent practice"
                    enabled={rt.youDo.notes?.enabled ?? false}
                    onToggle={() => updateSimple('youDo', 'notes', !rt.youDo.notes?.enabled)}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Validation message */}
        {validationErrors.resourceType && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A32D2D', fontSize: 12, marginTop: 8 }}>
            <Info size={12} />
            {validationErrors.resourceType}
          </div>
        )}
      </div>

      {/* ── Global AI Chat strip ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderTop: '0.5px solid #AFA9EC',
          background: '#EEEDFE',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30, height: 30, borderRadius: 7,
              background: '#AFA9EC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Sparkles size={14} color="#3C3489" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3C3489' }}>AI Chat — Global</div>
            <div style={{ fontSize: 11, color: '#534AB7', marginTop: 1 }}>
              Enable AI assistant across all course content
            </div>
          </div>
        </div>
        <Toggle
          checked={formData.aiChatGlobal}
          onChange={() =>
            setFormData((prev: any) => ({ ...prev, aiChatGlobal: !prev.aiChatGlobal }))
          }
          color="#534AB7"
        />
      </div>
    </div>
  );
};

export default ResourceTypeSection;