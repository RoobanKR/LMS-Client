'use client';

// Everyone enrolled on one course, opened from the people-count on a staff
// course card. Students and staff (trainers, admins…) sit on separate tabs; a
// person enrolled in several batches is listed once, with every batch named.
//
// Reads the same roster the Enrollment screen does (courses-data ?roster=1)
// and splits on the same rule: role "student" is a student, anyone else staff.

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Search, UserCog, Users, X } from 'lucide-react';
import { getToken } from '@/lib/session';
import { API_BASE_URL } from '@/lib/http';

type Tab = 'students' | 'staff';

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  batches: string[];
  status: string;
}

const roleName = (role: any): string =>
  typeof role === 'string' ? role : role?.renameRole || role?.originalRole || '';
const isStudentRole = (role: any): boolean => {
  const r = typeof role === 'string' ? role : role?.originalRole || role?.renameRole || '';
  return r.trim().toLowerCase() === 'student';
};

const fetchRoster = async (courseId: string) => {
  const token = getToken();
  const institution = typeof window !== 'undefined' ? localStorage.getItem('smartcliff_institution') || '' : '';
  const res = await fetch(`${API_BASE_URL}/getAll/courses-data/${courseId}?roster=1`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', institution },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success || !body?.data) throw new Error(body?.message || 'Could not load the enrolled list.');
  return body.data as { batchAndParticipants?: any[] };
};

/** One row per person across all batches, students and staff apart. */
const toPeople = (batches: any[] = []) => {
  const byId = new Map<string, Person & { student: boolean }>();
  batches.forEach((batch) => {
    const batchName = String(batch?.batchName || '').trim();
    (batch?.users || []).forEach((entry: any) => {
      const u = entry?.user;
      if (!u || typeof u !== 'object') return;
      const id = String(u._id || u.id || '');
      if (!id) return;
      const existing = byId.get(id);
      if (existing) {
        if (batchName && !existing.batches.includes(batchName)) existing.batches.push(batchName);
        return;
      }
      byId.set(id, {
        id,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'Unnamed user',
        email: u.email || '',
        role: roleName(u.role),
        batches: batchName ? [batchName] : [],
        status: String(entry?.status || 'active'),
        student: isStudentRole(u.role),
      });
    });
  });
  const all = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { students: all.filter((p) => p.student), staff: all.filter((p) => !p.student) };
};

const STATUS_TONE: Record<string, string> = {
  suspended: 'bg-[#fff6e3] text-[#b45309]',
  dropped: 'bg-danger-50 text-danger-700',
  completed: 'bg-success-50 text-success-700',
};

export default function EnrolledPeopleModal({ courseId, courseName, onClose }: {
  courseId: string;
  courseName: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('students');
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['courseRoster', courseId],
    queryFn: () => fetchRoster(courseId),
    staleTime: 60_000,
  });
  const people = useMemo(() => toPeople(data?.batchAndParticipants), [data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const list = people[tab];
  const q = query.trim().toLowerCase();
  const shown = q ? list.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) : list;

  const TABS: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'students', label: 'Students', icon: GraduationCap, count: people.students.length },
    { key: 'staff', label: 'Staff', icon: UserCog, count: people.staff.length },
  ];

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="enrolled-title" className="flex max-h-[85vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <p id="enrolled-title" className="flex items-center gap-2 text-[15px] font-semibold text-heading">
              <Users size={18} className="shrink-0 text-brand-600" />Enrolled people
            </p>
            <p className="mt-0.5 truncate text-xs text-subtle" title={courseName}>{courseName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-row-hover hover:text-body">
            <X size={17} />
          </button>
        </div>

        {/* tabs + search */}
        <div className="flex flex-col gap-3 border-b border-hairline px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" className="inline-flex w-fit rounded-lg bg-surface-sunken p-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors ${tab === t.key ? 'bg-surface text-heading shadow-xs' : 'text-subtle hover:text-body'}`}
              >
                <t.icon size={15} />{t.label}
                <span className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${tab === t.key ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-600'}`}>{isLoading ? '…' : t.count}</span>
              </button>
            ))}
          </div>
          <label className="flex h-8 items-center gap-2 rounded-lg border border-hairline bg-surface px-2.5 focus-within:border-hairline-strong sm:w-56">
            <Search size={14} className="shrink-0 text-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="min-w-0 flex-1 bg-transparent text-[13px] text-body outline-none placeholder:text-faint" />
          </label>
        </div>

        {/* list */}
        <div className="min-h-[200px] flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="space-y-2 px-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-ink-100" />)}
            </div>
          ) : error ? (
            <p className="px-3 py-10 text-center text-[13px] text-danger-700">{(error as Error).message}</p>
          ) : shown.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px] text-subtle">
              {q ? 'No one matches that search.' : tab === 'students' ? 'No students are enrolled on this course yet.' : 'No staff are enrolled on this course yet.'}
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {shown.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${tab === 'students' ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-700'}`}>
                    {(p.name.trim()[0] || '?').toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-heading">{p.name}</span>
                      {tab === 'staff' && p.role && <span className="shrink-0 rounded-md bg-ink-100 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-700">{p.role}</span>}
                      {p.status !== 'active' && <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium capitalize ${STATUS_TONE[p.status] || 'bg-ink-100 text-ink-700'}`}>{p.status}</span>}
                    </span>
                    {p.email && <span className="block truncate text-[11.5px] text-subtle">{p.email}</span>}
                  </span>
                  {p.batches.length > 0 && (
                    <span className="hidden max-w-[40%] shrink-0 flex-wrap justify-end gap-1 sm:flex">
                      {p.batches.slice(0, 2).map((b) => <span key={b} className="truncate rounded-md border border-hairline bg-surface-sunken px-1.5 py-0.5 text-[10.5px] text-ink-700">{b}</span>)}
                      {p.batches.length > 2 && <span className="text-[10.5px] text-faint">+{p.batches.length - 2}</span>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
