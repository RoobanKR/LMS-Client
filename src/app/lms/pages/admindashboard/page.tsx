'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
    Users, BookOpen, Layers, Search, Download, Calendar, 
    AlertCircle, Filter, Sparkles, TrendingUp, Trophy
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '../../component/layout';

// --- API & UTILS ---
const API_BASE_URL = 'https://lms-server-ym1q.onrender.com';
const ENDPOINT = '/student-Dashboard/courses-data/analytics';

const fetchDashboardData = async () => {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('smartcliff_token') || localStorage.getItem('token')
        : null;

    if (!token) throw new Error("Authentication token not found.");

    const response = await axios.get(`${API_BASE_URL}${ENDPOINT}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
};

// --- STYLING CONSTANTS ---
const COLORS = {
    primary: '#111827',
    accent: '#6366f1',
    chartPalette: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6']
};

// --- ANIMATED COMPONENTS ---

const CountUp = ({ end, duration = 2000, suffix = "" }: { end: number, duration?: number, suffix?: string }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4); // Ease out quart
            
            setCount(Math.floor(ease * end));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [end, duration]);

    return <span>{count.toLocaleString()}{suffix}</span>;
};

const RadialProgress = ({ percentage, color = "#6366f1" }: { percentage: number, color?: string }) => {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const safePercentage = isNaN(percentage) ? 0 : Math.min(Math.max(percentage, 0), 100);
    const offset = circumference - (safePercentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center">
            <svg className="transform -rotate-90 w-16 h-16">
                <circle cx="32" cy="32" r={radius} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                <circle 
                    cx="32" cy="32" r={radius} 
                    stroke={color} 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={offset} 
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <span className="absolute text-[10px] font-bold text-slate-700">{safePercentage}%</span>
        </div>
    );
};

const BentoCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
    <div 
        className={`bg-white rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden
        hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] hover:border-gray-200 transition-all duration-500 ease-out ${className}`}
        style={{ animationDelay: `${delay}ms` }}
    >
        {children}
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 p-4 rounded-xl shadow-2xl z-50">
                <p className="text-gray-200 font-medium text-xs mb-2 font-heading">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.stroke }} />
                        <span className="text-white font-heading font-semibold">
                            {entry.value}
                        </span>
                        <span className="text-gray-400 text-xs capitalize">{entry.name}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function AdminDashboard() {
    const { data: apiResponse, isLoading, isError, refetch } = useQuery({
        queryKey: ['admin-analytics'],
        queryFn: fetchDashboardData,
        retry: 1
    });

    const analytics = apiResponse?.data?.analytics;
    const courses = apiResponse?.data?.courses || [];
    const summary = apiResponse?.data?.summary;

    // --- DATA PREPARATION ---

    // 1. Content Density Data (Bar Chart)
    const densityData = useMemo(() => {
        if (!courses || courses.length === 0) return [];
        return courses
            .map((c: any) => ({
                name: c.courseCode || c.courseName?.substring(0, 8) + '...',
                fullName: c.courseName,
                modules: c.stats?.modules || 0,
                topics: c.stats?.topics || 0,
            }))
            .sort((a: any, b: any) => b.topics - a.topics)
            .slice(0, 8); 
    }, [courses]);

    // 2. Service Distribution Data (Pie Chart)
    const serviceData = useMemo(() => {
        if (!summary?.coursesByService) return [];
        return Object.entries(summary.coursesByService).map(([name, value], i) => ({
            name,
            value,
            fill: COLORS.chartPalette[i % COLORS.chartPalette.length]
        }));
    }, [summary]);

    // 3. Top Enrollment Trend Data (Area Chart)
    const enrollmentTrendData = useMemo(() => {
        if (!courses || courses.length === 0) return [];
        return courses
            .sort((a: any, b: any) => (b.stats?.participants || 0) - (a.stats?.participants || 0))
            .slice(0, 10) // More data points for smoother graph
            .map((c: any) => ({
                name: c.courseCode || "CC",
                participants: c.stats?.participants || 0
            }));
    }, [courses]);

    const engagementRate = useMemo(() => {
        if (!analytics?.totalParticipants) return 0;
        return Math.round((analytics.totalActiveParticipants / analytics.totalParticipants) * 100) || 0;
    }, [analytics]);

    // --- RENDER STATES ---

    if (isLoading) return (
        <DashboardLayout>
            <div className="min-h-screen bg-gray-50 p-8 space-y-8 flex flex-col justify-center items-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 font-heading animate-pulse">Synchronizing Dashboard...</p>
            </div>
        </DashboardLayout>
    );

    if (isError) return (
        <DashboardLayout>
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md border border-red-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-heading font-bold text-gray-900 mb-2">Connection Failed</h2>
                    <p className="text-gray-500 mb-6 text-sm">Unable to fetch live analytics data.</p>
                    <Button onClick={() => refetch()} className="bg-gray-900 text-white rounded-full px-8">Retry Connection</Button>
                </div>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Montserrat:wght@500;600;700;800&display=swap');
                
                .font-sans { font-family: 'Inter', sans-serif; }
                .font-heading { font-family: 'Montserrat', sans-serif; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>

            <div className="min-h-screen bg-gray-50 font-sans text-gray-900 p-6 md:p-10 max-w-[1920px] mx-auto">
                
                {/* --- HEADER --- */}
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-bold tracking-widest text-gray-400 uppercase font-heading">Live Analytics</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 tracking-tight">
                            Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Overview</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-full border border-gray-200 shadow-sm">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors" size={16} />
                            <input 
                                className="pl-9 pr-4 py-2 bg-transparent text-sm outline-none w-48 transition-all focus:w-64 placeholder:text-gray-400 font-medium" 
                                placeholder="Filter data..." 
                            />
                        </div>
                        <div className="h-6 w-px bg-gray-200" />
                        <Button variant="ghost" className="rounded-full h-9 w-9 p-0 hover:bg-gray-100 text-gray-500">
                            <Calendar size={16} />
                        </Button>
                        <Button className="rounded-full bg-gray-900 hover:bg-black text-white px-5 h-9 shadow-lg shadow-gray-900/10 font-heading text-xs font-bold uppercase tracking-wide">
                            <Download size={14} className="mr-2" /> Export
                        </Button>
                    </div>
                </header>

                {/* --- KPI GRID (4 COLUMNS) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    
                    {/* CARD 1: Total Courses */}
                    <BentoCard className="p-6 relative group flex flex-col justify-between h-[180px]">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-600 transition-colors duration-300">
                                <BookOpen size={18} className="text-indigo-600 group-hover:text-white transition-colors" />
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                <TrendingUp size={10} /> Active
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-heading font-bold text-gray-900 tracking-tight">
                                <CountUp end={analytics?.totalCourses || 0} />
                            </div>
                            <p className="text-sm font-medium text-gray-400 mt-1">Total Curriculums</p>
                        </div>
                        <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <BookOpen size={100} />
                        </div>
                    </BentoCard>

                    {/* CARD 2: Total Learners */}
                    <BentoCard className="p-6 relative group flex flex-col justify-between h-[180px]">
                         <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-violet-50 rounded-xl group-hover:bg-violet-600 transition-colors duration-300">
                                <Users size={18} className="text-violet-600 group-hover:text-white transition-colors" />
                            </div>
                            <Badge variant="outline" className="border-violet-100 text-violet-600 text-[10px]">Students</Badge>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-4xl font-heading font-bold text-gray-900 tracking-tight">
                                    <CountUp end={analytics?.totalParticipants || 0} />
                                </div>
                                <p className="text-sm font-medium text-gray-400 mt-1">Total Learners</p>
                            </div>
                            <div className="mb-1 mr-2">
                                <RadialProgress percentage={engagementRate} color="#8b5cf6" />
                            </div>
                        </div>
                    </BentoCard>

                    {/* CARD 3: Content Modules */}
                    <BentoCard className="p-6 group flex flex-col justify-between h-[180px]">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2.5 bg-blue-50 rounded-xl group-hover:bg-blue-600 transition-colors duration-300">
                                <Layers size={18} className="text-blue-600 group-hover:text-white transition-colors" />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Topics</span>
                                <span className="text-lg font-bold text-gray-900 leading-none">{analytics?.totalTopics || 0}</span>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <div className="text-4xl font-heading font-bold text-gray-900 tracking-tight">
                                <CountUp end={analytics?.totalModules || 0} />
                            </div>
                            <p className="text-sm font-medium text-gray-400 mt-1">Learning Modules</p>
                        </div>
                    </BentoCard>

                    {/* CARD 4: Top Enrollment (Standard Card Style, Black Graph) */}
                    <BentoCard className="p-0 flex flex-col justify-between group h-[180px] overflow-hidden">
                        <div className="p-6 pb-0 relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-gray-800 transition-colors duration-300">
                                    <Trophy size={18} className="text-gray-600 group-hover:text-white transition-colors" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                    Top Courses
                                </span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-heading font-bold text-gray-900 tracking-tight mb-1">Enrollment</h3>
                                <p className="text-gray-400 text-xs font-medium">Participant Trend</p>
                            </div>
                        </div>
                        
                        <div className="h-20 w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={enrollmentTrendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="blackGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#111827" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <RechartsTooltip 
                                        content={<CustomTooltip />}
                                        cursor={{ stroke: '#e5e7eb' }}
                                    />
                                    {/* isAnimationActive defaults to true, but explicitly setting it */}
                                    <Area 
                                        type="monotone" 
                                        dataKey="participants" 
                                        stroke="#111827" 
                                        strokeWidth={2} 
                                        fill="url(#blackGradient)"
                                        isAnimationActive={true}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </BentoCard>
                </div>

                {/* --- ANALYTICS CHARTS --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                    <BentoCard className="lg:col-span-2 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-heading font-bold text-gray-900">Content Density</h3>
                                <p className="text-sm text-gray-500">Complexity breakdown by top courses</p>
                            </div>
                            <Button variant="outline" size="sm" className="hidden sm:flex rounded-full text-xs font-bold border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 bg-white">
                                <Filter size={12} className="mr-2" /> Filter View
                            </Button>
                        </div>
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={densityData} barSize={32} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500, fontFamily: 'Inter' }} 
                                        dy={10}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'Inter' }} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                                    <Bar dataKey="topics" name="Total Topics" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="modules" name="Total Modules" stackId="a" fill="#e5e7eb" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </BentoCard>

                    <BentoCard className="p-8 flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-lg font-heading font-bold text-gray-900">Service Distribution</h3>
                            <p className="text-sm text-gray-500">Allocation by course category</p>
                        </div>
                        <div className="flex-1 relative min-h-[250px]">
                            {serviceData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={serviceData} cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={100} paddingAngle={5}
                                            dataKey="value" stroke="none" cornerRadius={4}
                                        >
                                            {serviceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No distribution data available</div>
                            )}
                            {serviceData.length > 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <Sparkles size={20} className="text-gray-300 mb-1" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest font-heading">Services</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {serviceData.map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                    <span className="text-[10px] font-bold text-gray-600">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </BentoCard>
                </div>

                {/* --- DATA TABLE SECTION (FIXED HEIGHT + SCROLL) --- */}
                <div className="mb-6">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-2xl font-heading font-bold text-gray-900">Active Curriculum</h3>
                            <p className="text-gray-500 mt-1">Full directory of active courses and their live status.</p>
                        </div>
                        <Button variant="outline" className="border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-wider">
                            View All Directory
                        </Button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                        <div className="overflow-y-auto h-[500px] custom-scrollbar relative">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm shadow-sm border-b border-gray-100">
                                    <tr>
                                        <th className="py-5 pl-8 text-[11px] font-bold text-gray-400 uppercase tracking-widest font-heading">Course Details</th>
                                        <th className="py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest font-heading">Service Type</th>
                                        <th className="py-5 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest font-heading">Structure</th>
                                        <th className="py-5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest font-heading">Participants</th>
                                        <th className="py-5 pr-8 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest font-heading">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {courses.length > 0 ? courses.map((course: any) => (
                                        <tr key={course._id || course.courseCode} className="group hover:bg-gray-50/50 transition-colors duration-200">
                                            <td className="py-4 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm font-heading">
                                                        {course.courseCode?.substring(0,2).toUpperCase() || "CC"}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-800 group-hover:text-indigo-700 transition-colors font-heading">
                                                            {course.courseName}
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-medium mt-0.5">
                                                            {course.clientName || 'Standard Access'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <Badge variant="secondary" className="bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all font-medium rounded-md px-2.5 py-1">
                                                    {course.serviceType}
                                                </Badge>
                                            </td>
                                            <td className="py-4 text-center">
                                                <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                                    <Layers size={14} className="text-indigo-400" />
                                                    {course.stats?.modules || 0} Modules
                                                </div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-sm font-bold text-gray-700 font-heading">{course.stats?.participants || 0}</span>
                                                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                                                        Active
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-8 text-right">
                                                <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 font-bold text-xs uppercase tracking-wide">
                                                    Manage
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">
                                                No courses found in the directory.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}