"use client"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, Search, BookOpen, Clock, Users, Eye, Edit, Copy, Trash2, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

import { useState } from "react";
import DashboardLayoutProgramcoordinator from "../../components/layout";
import Link from "next/link";

export default function CourseAddStructurePage() {
    // Sample data - replace with your actual data
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const courseModules = [
        {
            id: "1",
            title: "Java full stack",
            duration: "30 min",
            lessons: 4,
            level: "Beginner",
            status: "Published",
        },
        {
            id: "2",
            title: "UI/UX development",
            duration: "2 hours",
            lessons: 8,
            level: "Intermediate",
            status: "Draft",
        },
        {
            id: "3",
            title: "Machine Learning",
            duration: "1.5 hours",
            lessons: 6,
            level: "Advanced",
            status: "Published",
        },
        {
            id: "4",
            title: "CAD Design",
            duration: "3 hours",
            lessons: 3,
            level: "Advanced",
            status: "Unpublished",
        },
    ];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Published":
                return "bg-emerald-50 text-emerald-700 border border-emerald-200";
            case "Draft":
                return "bg-amber-50 text-amber-700 border border-amber-200";
            case "Unpublished":
                return "bg-slate-50 text-slate-600 border border-slate-200";
            default:
                return "bg-slate-50 text-slate-600 border border-slate-200";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Published":
                return <Eye className="h-3 w-3" />;
            case "Draft":
                return <Edit className="h-3 w-3" />;
            case "Unpublished":
                return <BookOpen className="h-3 w-3" />;
            default:
                return <BookOpen className="h-3 w-3" />;
        }
    };

    const getLevelStyle = (level: string) => {
        switch (level) {
            case "Beginner":
                return "bg-green-100 text-green-700 border border-green-200";
            case "Intermediate":
                return "bg-yellow-100 text-yellow-700 border border-yellow-200";
            case "Advanced":
                return "bg-red-100 text-red-700 border border-red-200";
            default:
                return "bg-slate-100 text-slate-600 border border-slate-200";
        }
    };

    return (
        <DashboardLayoutProgramcoordinator>
            <div>
                <div className="mx-auto">
                    {/* Breadcrumbs */}
                    <div className="mb-4">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink
                                        href="/programcoordinator/pages/dashboardprogramcoordinator"
                                        className="text-slate-600 hover:text-indigo-600 transition-colors"
                                    >
                                        Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="text-slate-400" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-slate-900 font-medium">
                                        Course Structure
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    {/* Header with enhanced styling */}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="relative w-full sm:flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search modules..."
                                className="w-full pl-8 bg-slate-50/80 border-slate-200 text-xs h-8 focus:ring-0 focus:outline-none"
                            />
                        </div>
                        {/* <Link href="/programcoordinator/pages/addmodule" passHref>
                            <Button size={'sm'} className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-5 hover:cursor-pointer whitespace-nowrap">
                                <PlusIcon className=" h-4 w-4" />
                                course
                            </Button>
                        </Link> */}
                    </div>

                    {/* Enhanced Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50 hover:bg-slate-100/70 border-b border-slate-200">
                                    <TableHead className="font-semibold text-slate-700 py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4" />
                                            Course Name
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-center font-semibold text-slate-700 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Duration
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-center font-semibold text-slate-700 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <GraduationCap className="h-4 w-4" />
                                            Level
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-center font-semibold text-slate-700 py-4">Status</TableHead>
                                    <TableHead className="text-center font-semibold text-slate-700 py-4">Actions</TableHead>
                                    {/* <TableHead className="text-right font-semibold text-slate-700 py-4 px-6">Actions</TableHead> */}
                                </TableRow>
                            </TableHeader>
                            <TableBody className="text-sm">
                                {courseModules.map((module, index) => (
                                    <TableRow
                                        key={module.id}
                                        className="hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-100 group"
                                    >
                                        <TableCell className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center text-indigo-600 font-semibold text-xs">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors text-xs">
                                                        {module.title}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-4">
                                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-medium">
                                                <Clock className="h-3 w-3" />
                                                {module.duration}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getLevelStyle(module.level)}`}>
                                                <GraduationCap className="h-3 w-3" />
                                                {module.level}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusStyle(module.status)}`}>
                                                {getStatusIcon(module.status)}
                                                {module.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center py-4">
                                            <div className="flex justify-center gap-2">
                                                <Link href="/programcoordinator/pages/addmodule2" passHref>
                                                    <Button size={'sm'} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-5 hover:cursor-pointer whitespace-nowrap">
                                                        <PlusIcon className="h-4 w-4" />
                                                        View & Add
                                                    </Button>
                                                </Link>
                                                <Link href="/programcoordinator/pages/pedagogy3" passHref>
                                                    <Button size={'sm'} variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200 px-5 hover:cursor-pointer whitespace-nowrap">
                                                        Pedagogy
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                        {/* <TableCell className="text-right py-4 px-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem className="text-slate-700 hover:text-indigo-600">
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-slate-700 hover:text-blue-600">
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell> */}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

        </DashboardLayoutProgramcoordinator>
    );
}