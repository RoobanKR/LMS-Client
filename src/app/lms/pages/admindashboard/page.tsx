'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import {
    LayoutTemplate, Users, BookOpen, Layers,
    ArrowUpRight, Activity, Search, Filter,
    GraduationCap, Zap, MoreHorizontal, FileText,
    Download, Calendar, AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '../../component/layout';

// --- API CONFIGURATION ---
const API_BASE_URL = 'https://lms-client-jade-three.vercel.app'; // Adjust port if needed
const ENDPOINT = '/student-Dashboard/courses-data/analytics'; // Matches your router

// --- FETCH FUNCTION WITH TOKEN ---
const fetchDashboardData = async () => {
    // 1. Retrieve Token
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('smartcliff_token') || localStorage.getItem('token')
        : null;

    if (!token) {
        throw new Error("Authentication token not found. Please login.");
    }

    // 2. Make Authenticated Request
    const response = await axios.get(`${API_BASE_URL}${ENDPOINT}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
};

// --- VISUAL CONSTANTS ---
const COLORS = {
    primary: '#0F172A',   // Slate 900
    accent: '#4F46E5',    // Indigo 600
    success: '#10B981',   // Emerald 500
    warning: '#F59E0B',   // Amber 500
    rose: '#F43F5E',      // Rose 500
    grid: '#F1F5F9'       // Light Gray
};

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4'];

export default function AdminDashboard() {
    const { data: apiResponse, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['admin-analytics'],
        queryFn: fetchDashboardData,
        retry: 1
    });

    const analytics = apiResponse?.data?.analytics;
    const courses = apiResponse?.data?.courses || [];
    const summary = apiResponse?.data?.summary;

    // --- DATA PROCESSING ---

    // 1. Content Density (Bar Chart)
    const densityData = useMemo(() => {
        return courses
            .map((c: any) => ({
                name: c.courseCode || c.courseName.substring(0, 8) + '...',
                fullName: c.courseName,
                modules: c.stats?.modules || 0,
                topics: c.stats?.topics || 0,
                subTopics: c.stats?.subTopics || 0
            }))
            .sort((a: any, b: any) => b.topics - a.topics)
            .slice(0, 10);
    }, [courses]);

    // 2. Course Distribution (Pie Chart)
    const serviceData = useMemo(() => {
        if (!summary?.coursesByService) return [];
        return Object.entries(summary.coursesByService).map(([name, value], i) => ({
            name,
            value,
            fill: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [summary]);

    // 3. Calculate Engagement Rate
    const engagementRate = useMemo(() => {
        if (!analytics?.totalParticipants) return 0;
        return Math.round((analytics.totalActiveParticipants / analytics.totalParticipants) * 100) || 0;
    }, [analytics]);

    if (isLoading) return (
        <DashboardLayout>
            <div className="h-screen bg-white flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400">ANALYZING INSTITUTION DATA...</p>
            </div>
        </DashboardLayout>
    );

    if (isError) return (
        <DashboardLayout>
            <div className="h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="p-4 bg-red-50 rounded-full mb-4">
                    <AlertCircle className="text-red-500" size={32} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Data Access Restricted</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-md">
                    {(error as Error)?.message || "Failed to fetch analytics. Check your token or network connection."}
                </p>
                <Button onClick={() => refetch()} className="mt-6 bg-slate-900 text-white hover:bg-slate-800">
                    Retry Connection
                </Button>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-white font-sans text-slate-900 p-6 md:p-12 max-w-[1920px] mx-auto">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-slate-100 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                Admin Access
                            </div>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Data
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-slate-900">
                            Institution <span className="font-semibold">Insights</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 mt-6 md:mt-0">
                        <div className="hidden md:block text-right mr-4 border-r border-slate-100 pr-6">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Active</div>
                            <div className="text-lg font-mono text-slate-700">{analytics?.totalActiveParticipants || 0} Users</div>
                        </div>
                        <Button variant="outline" className="h-10 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-slate-200">
                            <Calendar className="w-3 h-3 mr-2" /> {new Date().toLocaleDateString()}
                        </Button>
                        <Button className="h-10 px-6 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-indigo-600 shadow-xl shadow-slate-200/50">
                            <Download className="w-3 h-3 mr-2" /> Report
                        </Button>
                    </div>
                </div>

                {/* --- SECTION 1: THE BIG NUMBERS (KPI Matrix) --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">

                    {/* Metric 1: Courses */}
                    <div className="group cursor-default">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Curriculum</span>
                            <BookOpen size={16} className="text-slate-300" />
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-6xl font-light tracking-tighter text-slate-900">
                                {analytics?.totalCourses || 0}
                            </span>
                            <div className="flex flex-col justify-end pb-2">
                                <span className="text-xs font-bold text-slate-500">Courses</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                            Across {Object.keys(summary?.coursesByService || {}).length} Service Types
                        </p>
                    </div>

                    {/* Metric 2: Engagement */}
                    <div className="group cursor-default border-l border-slate-100 pl-8">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Participants</span>
                            <Users size={16} className="text-slate-300" />
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-6xl font-light tracking-tighter text-slate-900">
                                {analytics?.totalParticipants || 0}
                            </span>
                            <div className="flex flex-col justify-end pb-2">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    {engagementRate}% Active
                                </span>
                            </div>
                        </div>
                        {/* Micro bar chart */}
                        <div className="flex gap-1 mt-3 h-1 w-full">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className={`flex-1 rounded-full ${i < (engagementRate / 10) ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Metric 3: Structure */}
                    <div className="group cursor-default border-l border-slate-100 pl-8">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Content Scale</span>
                            <Layers size={16} className="text-slate-300" />
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-6xl font-light tracking-tighter text-slate-900">
                                {analytics?.totalModules || 0}
                            </span>
                            <div className="flex flex-col justify-end pb-2">
                                <span className="text-xs font-bold text-slate-500">Modules</span>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] font-bold text-slate-400 uppercase">
                            <span>{analytics?.totalSubModules || 0} Subs</span>
                            <span className="text-slate-200">|</span>
                            <span>{analytics?.totalTopics || 0} Topics</span>
                        </div>
                    </div>

                    {/* Metric 4: Platform Health */}
                    <div className="group cursor-default border-l border-slate-100 pl-8">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Platform</span>
                            <Zap size={16} className="text-slate-300" />
                        </div>
                        <div className="flex items-center gap-4 h-full pb-4">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                                    <circle cx="32" cy="32" r="28" stroke="#4F46E5" strokeWidth="4" fill="transparent" strokeDasharray="175" strokeDashoffset="10" strokeLinecap="round" />
                                </svg>
                                <Activity size={20} className="text-indigo-600 absolute" />
                            </div>
                            <div>
                                <div className="text-xl font-light text-slate-900">Stable</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Status</div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* --- SECTION 2: VISUAL ANALYTICS --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 mb-24">

                    {/* Chart: Content Density */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Course Content Structure</h3>
                                <p className="text-xs text-slate-500 mt-1">Breakdown of topics and modules per course.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div> Topics
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <div className="w-2 h-2 rounded-full bg-slate-200"></div> Modules
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={densityData} barSize={40} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                        dy={10}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white p-4 rounded-none shadow-2xl min-w-[150px]">
                                                        <div className="font-bold text-sm mb-2">{data.fullName}</div>
                                                        <div className="space-y-1 text-xs">
                                                            <div className="flex justify-between text-indigo-300">
                                                                <span>Topics</span>
                                                                <span className="font-mono">{data.topics}</span>
                                                            </div>
                                                            <div className="flex justify-between text-slate-400">
                                                                <span>Modules</span>
                                                                <span className="font-mono">{data.modules}</span>
                                                            </div>
                                                            <div className="flex justify-between text-emerald-400 border-t border-slate-700 pt-1 mt-1">
                                                                <span>Students</span>
                                                                <span className="font-mono">{data.participants}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="topics" stackId="a" fill={COLORS.accent} radius={[0, 0, 2, 2]} />
                                    <Bar dataKey="modules" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart: Service Type Distribution */}
                    <div className="flex flex-col h-[400px] relative">
                        <div className="mb-8 border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold text-slate-900">Service Types</h3>
                            <p className="text-xs text-slate-500 mt-1">Distribution of course categories.</p>
                        </div>

                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={serviceData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={2}
                                        dataKey="value"
                                        startAngle={180}
                                        endAngle={0}
                                        stroke="none"
                                    >
                                        {serviceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#0F172A', border: 'none', color: '#fff', fontSize: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Floating Center Stat */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-12 pointer-events-none">
                                <span className="text-5xl font-light text-slate-900">{analytics?.totalCourses || 0}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Active</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 justify-center mt-auto">
                            {serviceData.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- SECTION 3: COURSE MATRIX (List View) --- */}
                <div className="bg-white">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-slate-900">Course Directory</h3>

                        <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full w-72 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm">
                            <Search size={14} className="text-slate-400" />
                            <input
                                className="bg-transparent border-none outline-none text-xs font-medium w-full text-slate-700 placeholder:text-slate-400"
                                placeholder="Search by name or code..."
                            />
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 pl-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[30%]">Course Identity</th>
                                    <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Level & Service</th>
                                    <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Modules</th>
                                    <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Enrollment</th>
                                    <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Created</th>
                                    <th className="py-4 pr-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {courses.map((course: any, idx: number) => (
                                    <tr key={course._id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer">

                                        {/* Name */}
                                        <td className="py-3 pl-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                    {course.courseCode || (idx + 1).toString().padStart(2, '0')}
                                                </div>

                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">{course.courseName}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[250px]">
                                                        {course.clientName || 'General'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Meta Tags */}
                                        <td className="py-5">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <Badge variant="secondary" className="font-mono text-[9px] uppercase bg-slate-100 text-slate-600 hover:bg-slate-200">
                                                    {course.courseLevel || 'Standard'}
                                                </Badge>
                                                <span className="text-[10px] text-slate-400 font-medium px-1">
                                                    {course.serviceType || 'Core'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Structure */}
                                        <td className="py-5 text-center">
                                            <div className="inline-flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                                                <div className="flex items-center gap-1.5" title="Modules">
                                                    <LayoutTemplate size={12} className="text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-700">{course.stats.modules}</span>
                                                </div>
                                                <div className="w-px h-3 bg-slate-200"></div>
                                                <div className="flex items-center gap-1.5" title="Topics">
                                                    <FileText size={12} className="text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-700">{course.stats.topics}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Enrollment */}
                                        <td className="py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-light text-slate-900">{course.stats.participants}</span>
                                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded-md mt-1">
                                                    {course.stats.activeParticipants} Active
                                                </span>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="py-5 text-right">
                                            <span className="text-xs font-mono text-slate-500">
                                                {new Date(course.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>

                                        {/* Action */}
                                        <td className="py-5 pr-4 text-right">
                                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full">
                                                <MoreHorizontal size={18} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {courses.length === 0 && (
                        <div className="py-24 text-center border-t border-slate-100">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="text-slate-300" size={24} />
                            </div>
                            <p className="text-sm font-bold text-slate-900">No Course Data Available</p>
                            <p className="text-xs text-slate-500 mt-2">Initialize your database with courses to see analytics.</p>
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
}