"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BookOpen, Building2, Search } from 'lucide-react';
import { StaffLayout } from '@/app/lms/component/stafflayout/staff-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { http } from '@/lib/http';
import { enrolledCourses, groupCourseClients, type ManagedCourse } from './courseScope';

export default function TrainerCourseManagement() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('smartcliff_userData') || 'null');
      setUserId(user?._id || '');
    } catch { setUserId(''); }
  }, []);

  const query = useQuery({
    queryKey: ['courseStructures', 'trainer-enrolled', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ManagedCourse[]> => {
      const response = await http.get('/courses-structure/getAll', {
        params: { summary: 'enrolled', scope: 'enrolled' },
      });
      if (!Array.isArray(response.data?.data)) throw new Error('Unable to load your courses.');
      // Also scope cached responses and responses from older API deployments.
      return enrolledCourses(response.data.data, userId!);
    },
  });

  const clients = useMemo(() => groupCourseClients(query.data || []), [query.data]);
  const selected = clients.find((client) => client.id === clientId);
  const term = search.trim().toLowerCase();
  const visibleClients = clients.filter((client) => client.name.toLowerCase().includes(term) ||
    client.courses.some((course) => `${course.courseName || ''} ${course.courseCode || ''}`.toLowerCase().includes(term)));
  const visibleCourses = (selected?.courses || []).filter((course) =>
    `${course.courseName || ''} ${course.courseCode || ''} ${course.serviceType || ''} ${course.serviceModal || ''}`.toLowerCase().includes(term));
  const loading = userId === null || (!!userId && query.isPending);
  const openClient = (id: string | null) => { setClientId(id); setSearch(''); };
  const tableCell = 'px-5 py-4 text-sm';

  return (
    <StaffLayout>
      <div className="w-full space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {selected && <button onClick={() => openClient(null)} className="mb-3 inline-flex items-center gap-2 text-sm text-subtle hover:text-heading"><ArrowLeft className="h-4 w-4" />All my clients</button>}
            <h1 className="text-2xl font-semibold text-heading">{selected?.name || 'Course Management'}</h1>
            <p className="mt-1 text-sm text-subtle">{selected ? 'Manage the courses you are enrolled in for this client.' : 'Your enrolled courses, organised by client.'}</p>
          </div>
          {!loading && !query.isError && <div className="flex gap-3 text-sm">
            <span className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-3"><Building2 className="h-4 w-4 text-brand" /><strong>{clients.length}</strong> Clients</span>
            <span className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-3"><BookOpen className="h-4 w-4 text-brand" /><strong>{query.data?.length || 0}</strong> Courses</span>
          </div>}
        </header>

        {loading ? <div className="space-y-3 rounded-xl border border-hairline bg-surface p-5" aria-label="Loading your enrolled courses"><Skeleton className="h-10 w-72" />{[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-16 w-full" />)}</div> :
          query.isError || !userId ? <div role="alert" className="rounded-xl border border-hairline bg-surface p-8 text-center"><p className="text-heading">{!userId ? 'Sign in to view your enrolled courses.' : 'Unable to load your enrolled courses.'}</p>{userId && <Button className="mt-4" onClick={() => query.refetch()}>Try again</Button>}</div> :
          <section className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-5">
              <h2 className="font-semibold text-heading">{selected ? 'My courses' : 'My clients'} <span className="ml-2 text-sm font-normal text-subtle">({selected ? visibleCourses.length : visibleClients.length})</span></h2>
              <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-3 h-4 w-4 text-subtle" /><Input className="pl-9" aria-label={selected ? 'Search your courses' : 'Search your clients or courses'} placeholder={selected ? 'Search courses…' : 'Search clients or courses…'} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            </div>
            {(selected ? visibleCourses.length : visibleClients.length) === 0 ? <div className="px-6 py-16 text-center"><BookOpen className="mx-auto mb-4 h-8 w-8 text-subtle" /><p className="font-medium text-heading">{term ? 'No matches found' : 'No enrolled courses yet'}</p><p className="mt-2 text-sm text-subtle">{term ? 'Try another client or course name.' : 'Clients appear here when you are enrolled in one of their courses.'}</p></div> :
              <div className="overflow-x-auto"><table className="w-full text-left">
                <thead className="bg-canvas text-xs uppercase tracking-wide text-subtle"><tr>{(selected ? ['Course', 'Service', 'Modules', 'Status', 'Action'] : ['Client', 'Enrolled courses', 'Services', 'Action']).map((heading) => <th key={heading} className="px-5 py-3 font-medium">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-hairline">
                  {selected ? visibleCourses.map((course) => <tr key={course._id} className="hover:bg-canvas/50">
                    <td className={tableCell}><div className="font-medium text-heading">{course.courseName || 'Untitled course'}</div><div className="mt-1 text-xs text-subtle">{course.courseCode || '—'}</div></td>
                    <td className={tableCell}><div className="text-body">{course.serviceType || '—'}</div><div className="mt-1 text-xs text-subtle">{course.serviceModal}</div></td>
                    <td className={tableCell}>{course.moduleCount ?? '—'}</td>
                    <td className={tableCell}><span className="rounded-md bg-canvas px-2 py-1 text-xs capitalize text-body">{course.status || 'active'}</span></td>
                    <td className={tableCell}><Button asChild variant="outline" size="sm"><Link href={`/lms/pages/courses/uploadcourseresources?courseId=${encodeURIComponent(course._id)}`}>Manage course<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></td>
                  </tr>) : visibleClients.map((client) => <tr key={client.id} className="hover:bg-canvas/50">
                    <td className={tableCell}><div className="flex items-center gap-3"><span className="rounded-lg bg-brand/10 p-2 text-brand"><Building2 className="h-5 w-5" /></span><span className="font-medium text-heading">{client.name}</span></div></td>
                    <td className={tableCell}>{client.courses.length}</td>
                    <td className={`${tableCell} text-subtle`}>{[...new Set(client.courses.map((course) => course.serviceType).filter(Boolean))].join(', ') || '—'}</td>
                    <td className={tableCell}><Button variant="outline" size="sm" onClick={() => openClient(client.id)}>Manage courses<ArrowRight className="ml-2 h-4 w-4" /></Button></td>
                  </tr>)}
                </tbody>
              </table></div>}
          </section>}
      </div>
    </StaffLayout>
  );
}
