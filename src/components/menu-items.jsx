import {
    LayoutDashboard,
    Users,
    Book,
    GalleryVerticalEnd,
    FolderKanban,
    Blocks,
    ImageIcon,
    Briefcase,
    UserCheck,
    GraduationCap,
    MessageSquare,
    Globe,
} from "lucide-react";

export const sidebarData = {
    navMain: [
        {
            title: "General",
            items: [
                {
                    title: "Dashboard",
                    url: "/admin",
                    icon: LayoutDashboard,
                    badge: "New",
                },
            ],
        },
        {
            title: "User Management",
            items: [
                {
                    title: "Users",
                    url: "/admin/users",
                    icon: Users,
                },
                {
                    title: "Team",
                    icon: UserCheck,
                    isCollapsible: true,
                    items: [
                        {
                            title: "All Team Members",
                            url: "/admin/teams",
                            icon: UserCheck,
                        },
                        {
                            title: "Team Categories",
                            url: "/admin/teams/categories",
                            icon: FolderKanban,
                        },
                    ],
                },
            ],
        },
        
    ],
};