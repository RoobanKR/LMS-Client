"use client";

import { useEffect, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import MultiFileCodeEditor from '../../coursesdetailedview/components/multi-file-code-editor';

type Props = Omit<ComponentProps<typeof MultiFileCodeEditor>, 'preview' | 'theme'> & { onClose: () => void };

export default function StudentMultiFilePreview({ onClose, ...props }: Props) {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Student mock preview" style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-4 py-1 text-xs text-subtle">
        <span>Mock Preview · Student view</span><button type="button" onClick={onClose} className="font-medium text-heading">Close preview</button>
      </div>
      <div className="min-h-0 flex-1"><MultiFileCodeEditor {...props} preview theme={resolvedTheme === 'dark' ? 'dark' : 'light'} onBack={onClose} onCloseExercise={onClose} onNavigateToBreadcrumb={onClose} /></div>
    </div>, document.body,
  );
}
