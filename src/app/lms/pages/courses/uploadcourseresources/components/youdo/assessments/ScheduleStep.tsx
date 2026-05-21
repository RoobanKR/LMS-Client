// ScheduleStep.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, Lock, Bell, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { D } from './constants';
import { FormDataType, ValidationErrors } from './types';
import { InfoTooltip } from './UIComponents';

interface ScheduleStepProps {
  formData: FormDataType;
  setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  validationErrors: ValidationErrors;
  touchedFields: Set<string>;
  isEditing: boolean;
}

// Helper function to generate calendar days
const generateCalendarDays = (year: number, month: number): (number | null)[] => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};

// Date picker component
const DatePicker: React.FC<{
  value: { day: number; month: number; year: number; hour: number; minute: number };
  onChange: (date: { day: number; month: number; year: number; hour: number; minute: number }) => void;
  label: string;
  disabled?: boolean;
  minDate?: Date;
  error?: string;
  touched?: boolean;
  required?: boolean;
}> = ({ value, onChange, label, disabled, minDate, error, touched, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [calMonth, setCalMonth] = useState(value.month || new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(value.year || new Date().getFullYear());

  useEffect(() => {
    if (isOpen) {
      setTempDate(value);
      setCalMonth(value.month || new Date().getMonth() + 1);
      setCalYear(value.year || new Date().getFullYear());
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const formatDateTime = () => {
    if (value.day === 0 || value.month === 0 || value.year === 0) {
      return `Select ${label.toLowerCase()}`;
    }
    const date = new Date(value.year, value.month - 1, value.day, value.hour, value.minute);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isDayDisabled = (day: number): boolean => {
    if (!minDate) return false;
    const checkDate = new Date(calYear, calMonth - 1, day);
    checkDate.setHours(0, 0, 0, 0);
    const minDateOnly = new Date(minDate);
    minDateOnly.setHours(0, 0, 0, 0);
    return checkDate < minDateOnly;
  };

  const handleDateSelect = (day: number) => {
    if (isDayDisabled(day)) return;
    setTempDate(prev => ({ ...prev, day, month: calMonth, year: calYear }));
  };

  const handleTimeChange = (hour: number, minute: number) => {
    setTempDate(prev => ({ ...prev, hour, minute }));
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setIsOpen(false);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const hasValue = value.day > 0 && value.month > 0 && value.year > 0;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(v => !v)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
          error && touched ? 'border-red-300 bg-red-50/30' : 'border-[#ecedf1] bg-white'
        } ${
          disabled ? 'bg-[#fafafa] text-[#9b9bae] cursor-not-allowed' : 'hover:border-[#F27757] focus:border-[#F27757]'
        }`}
      >
        <span className={`truncate ${!hasValue ? 'text-[#9b9bae]' : 'text-[#1a1a2e]'}`}>
          {formatDateTime()}
        </span>
        <Calendar size={14} className="flex-shrink-0" style={{ color: D.textMuted }} />
      </button>
      {required && !hasValue && touched && !error && (
        <p className="mt-1 text-xs" style={{ color: D.red }}>{label} is required</p>
      )}
      {error && touched && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}

      {isOpen && !disabled && (
        <div
          ref={pickerRef}
          className="absolute z-[9999] p-4 rounded-xl shadow-2xl border bg-white"
          style={{ width: 320, top: '100%', left: 0, marginTop: 8 }}
        >
          {/* Calendar header */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => {
                  if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
                  else setCalMonth(m => m - 1);
                }}
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-bold">{months[calMonth - 1]} {calYear}</span>
              <button
                onClick={() => {
                  if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
                  else setCalMonth(m => m + 1);
                }}
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: D.textMuted }}>{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays(calYear, calMonth).map((day, idx) => {
                const isDisabled = day ? isDayDisabled(day) : true;
                const isSelected = tempDate.day === day && tempDate.month === calMonth && tempDate.year === calYear;
                const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() + 1 && calYear === new Date().getFullYear();
                return (
                  <button
                    key={idx}
                    onClick={() => day && !isDisabled && handleDateSelect(day)}
                    disabled={!day || isDisabled}
                    className="h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-all mx-auto"
                    style={{
                      background: isSelected ? D.orange : 'transparent',
                      color: isSelected ? '#fff' : isDisabled ? '#d1d5db' : '#1a1a2e',
                      fontWeight: isToday && !isSelected ? 700 : 400,
                      outline: isToday && !isSelected ? `1.5px solid ${D.orange}` : 'none',
                      cursor: !day || isDisabled ? 'default' : 'pointer',
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time picker */}
          <div className="border-t pt-3" style={{ borderColor: D.border }}>
            <div className="text-xs font-semibold mb-2" style={{ color: D.textMuted }}>Time</div>
            <div className="flex gap-2">
              <select
                value={tempDate.hour}
                onChange={e => handleTimeChange(parseInt(e.target.value), tempDate.minute)}
                className="flex-1 px-2 py-1.5 text-sm rounded-lg border outline-none"
                style={{ borderColor: D.border }}
              >
                {hours.map(h => (
                  <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                ))}
              </select>
              <select
                value={tempDate.minute}
                onChange={e => handleTimeChange(tempDate.hour, parseInt(e.target.value))}
                className="flex-1 px-2 py-1.5 text-sm rounded-lg border outline-none"
                style={{ borderColor: D.border }}
              >
                {minutes.map(m => (
                  <option key={m} value={m}>:{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-3 pt-2 border-t" style={{ borderColor: D.border }}>
            <button
              onClick={() => {
                const now = new Date();
                if (minDate && now < minDate) return;
                setTempDate({
                  day: now.getDate(),
                  month: now.getMonth() + 1,
                  year: now.getFullYear(),
                  hour: now.getHours(),
                  minute: now.getMinutes(),
                });
              }}
              className="text-xs font-semibold"
              style={{ color: D.orange }}
            >
              Now
            </button>
            <button
              onClick={() => { setTempDate(value); setIsOpen(false); }}
              className="text-xs font-semibold"
              style={{ color: D.textMuted }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
              style={{ background: D.orange }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  formData,
  setFormData,
  setValidationErrors,
  validationErrors,
  touchedFields,
  isEditing,
}) => {
  const updateScheduleField = (field: string, value: { day: number; month: number; year: number; hour: number; minute: number }) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value,
      },
    }));
    // Clear validation error
    setValidationErrors(prev => {
      const errors = { ...prev };
      if (field === 'startDate') delete errors.startDate;
      if (field === 'endDate') delete errors.endDate;
      if (field === 'cutOffDate') delete (errors as any).cutOffDate;
      if (field === 'gracePeriodDate') delete errors.gracePeriod;
      return errors;
    });
  };

  const getFieldValue = (fieldKey: string) => {
    return (formData.schedule as any)[fieldKey] || { day: 0, month: 0, year: 0, hour: 0, minute: 0 };
  };

  const getFieldError = (fieldKey: string): string | undefined => {
    if (fieldKey === 'startDate') return validationErrors.startDate;
    if (fieldKey === 'endDate') return validationErrors.endDate;
    if (fieldKey === 'cutOffDate') return (validationErrors as any).cutOffDate;
    if (fieldKey === 'gracePeriodDate') return validationErrors.gracePeriod;
    return undefined;
  };

  const getFieldTouched = (fieldKey: string): boolean => {
    if (fieldKey === 'startDate') return touchedFields.has('startDate');
    if (fieldKey === 'endDate') return touchedFields.has('endDate');
    if (fieldKey === 'cutOffDate') return touchedFields.has('cutOffDate');
    if (fieldKey === 'gracePeriodDate') return touchedFields.has('gracePeriod');
    return false;
  };

  const getMinDateForField = (fieldKey: string): Date | undefined => {
    const now = new Date();
    if (fieldKey === 'startDate') {
      return isEditing ? undefined : now;
    }
    if (fieldKey === 'endDate') {
      const startDate = getFieldValue('startDate');
      if (startDate.day > 0 && startDate.month > 0 && startDate.year > 0) {
        return new Date(startDate.year, startDate.month - 1, startDate.day, startDate.hour, startDate.minute);
      }
      return isEditing ? undefined : now;
    }
    if (fieldKey === 'cutOffDate') {
      const endDate = getFieldValue('endDate');
      if (endDate.day > 0 && endDate.month > 0 && endDate.year > 0) {
        return new Date(endDate.year, endDate.month - 1, endDate.day, endDate.hour, endDate.minute);
      }
      return undefined;
    }
    if (fieldKey === 'gracePeriodDate') {
      const cutOffDate = getFieldValue('cutOffDate');
      if (cutOffDate.day > 0 && cutOffDate.month > 0 && cutOffDate.year > 0) {
        return new Date(cutOffDate.year, cutOffDate.month - 1, cutOffDate.day, cutOffDate.hour, cutOffDate.minute);
      }
      const endDate = getFieldValue('endDate');
      if (endDate.day > 0 && endDate.month > 0 && endDate.year > 0) {
        return new Date(endDate.year, endDate.month - 1, endDate.day, endDate.hour, endDate.minute);
      }
      return undefined;
    }
    return undefined;
  };

  const handleToggleEnable = (fieldKey: string, enabledKey: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [enabledKey]: !(prev.schedule as any)[enabledKey],
      },
    }));
  };

  const DATE_FIELDS = [
    { 
      label: 'Start Date & Time', 
      fieldKey: 'startDate', 
      toggleable: false,
      tooltip: 'The date from which students can start submitting this exercise.',
      icon: <Calendar size={14} />,
      color: D.emerald,
      required: true,
    },
    { 
      label: 'End Date & Time', 
      fieldKey: 'endDate', 
      toggleable: false,
      tooltip: 'The actual submission deadline. Submissions after this date are not accepted.',
      icon: <Clock size={14} />,
      color: D.amber,
      required: true,
    },
    { 
      label: 'Cut-off Date & Time', 
      fieldKey: 'cutOffDate', 
      toggleable: true,
      enabledKey: 'cutOffEnabled',
      tooltip: 'Optional hard late boundary. Must be on or after the end date.',
      icon: <Lock size={14} />,
      color: D.red,
    },
    { 
      label: 'Grace Period', 
      fieldKey: 'gracePeriodDate', 
      toggleable: true,
      enabledKey: 'gracePeriodEnabled',
      tooltip: 'Additional time after cut-off date for submissions.',
      icon: <Bell size={14} />,
      color: D.purple,
    },
  ];

  return (
    <div className="px-4 py-3">
      <div className="mb-4 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: D.orangeLight, color: D.orange }}
        >
          <Calendar size={13} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Schedule Exercise
        </h3>
      </div>

      <div className="space-y-4">
        {DATE_FIELDS.map(({ label, fieldKey, toggleable, enabledKey, tooltip, icon, color, required }) => {
          const isEnabled = !toggleable || !!(formData.schedule as any)[enabledKey!];
          const value = getFieldValue(fieldKey);
          const error = getFieldError(fieldKey);
          const touched = getFieldTouched(fieldKey);
          const minDate = getMinDateForField(fieldKey);

          return (
            <div key={fieldKey} className="flex items-start gap-3">
              {/* Left side - Label */}
              <div className="w-36 flex-shrink-0 flex items-start gap-2 pt-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, color }}>
                  {icon}
                </div>
                <div className="flex items-center gap-0.5 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: '#000000' }}>{label}</span>
                  {required && <span className="text-xs font-bold flex-shrink-0" style={{ color: D.orange }}>*</span>}
                  {tooltip && <InfoTooltip content={tooltip} side="right" />}
                </div>
              </div>

              {/* Right side - Toggle and Picker */}
              <div className="flex-1 flex items-center gap-3">
                {toggleable && (
                  <button
                    type="button"
                    onClick={() => handleToggleEnable(fieldKey, enabledKey!)}
                    className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                    style={{ background: isEnabled ? D.orange : '#e2e3e8' }}
                  >
                    <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${
                      isEnabled ? 'translate-x-[17px]' : 'translate-x-0'
                    }`} />
                  </button>
                )}

                <div className="flex-1">
                  {isEnabled ? (
                    <DatePicker
                      value={value}
                      onChange={(newValue) => updateScheduleField(fieldKey, newValue)}
                      label={label}
                      minDate={minDate}
                      error={error}
                      touched={touched}
                      required={required}
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-[#fafafa]" style={{ borderColor: D.border }}>
                      <Lock size={12} style={{ color: D.textMuted }} />
                      <span className="text-xs" style={{ color: D.textMuted }}>Disabled</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};