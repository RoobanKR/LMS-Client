import { Card } from "@/components/ui/card";
import { Users, Lock, CheckCircle, XCircle } from "lucide-react";

interface StatusCardsProps {
    users: {
        id: string;
        firstName: string;
        lastName:string;
        gender:string;
        email: string;
        phone: string;
        role: string;
        status: "active" | "inactive";
        lastLogin: string;
    }[];
}

export function StatusCards({ users }: StatusCardsProps) {
    // Calculate statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === "active").length;
    const inactiveUsers = users.filter(user => user.status === "inactive").length;
    const adminUsers = users.filter(user => user.role === "Admin").length;

    const stats = [
        {
            title: "Total Users",
            value: totalUsers,
            icon: <Users className="text-gray-600" size={20} />,
            description: "All registered users",
            bgColor: "bg-gray-100"
        },
        {
            title: "Active Users",
            value: activeUsers,
            icon: <CheckCircle className="text-green-600" size={20} />,
            description: "Currently active users",
            bgColor: "bg-green-50"
        },
        {
            title: "Inactive Users",
            value: inactiveUsers,
            icon: <XCircle className="text-red-600" size={20} />,
            description: "Inactive accounts",
            bgColor: "bg-red-50"
        },
        {
            title: "Admins",
            value: adminUsers,
            icon: <Lock className="text-purple-600" size={20} />,
            description: "Administrator accounts",
            bgColor: "bg-purple-50"
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4  mb-4">
            {stats.map((item, idx) => (
                <div key={idx} className="bg-none border border-gray-300 rounded-lg  p-2">
                    <div className="flex items-center space-x-3">
                        <div className={`rounded-md p-2 ${item.bgColor}`}>
                            {item.icon}
                        </div>
                        <div>
                            <div className="text-gray-900  text-xs font-semibold" >
                                {item.value} {item.title}
                            </div>
                            <div className="text-gray-500" style={{ fontSize: "10px" }}>{item.description}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}