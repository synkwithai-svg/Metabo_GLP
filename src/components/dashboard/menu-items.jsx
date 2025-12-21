// import {
//     LayoutDashboard,
//     Users,
//     Book,
//     GalleryVerticalEnd,
//     FolderKanban,
//     Blocks,
//     ImageIcon,
//     Briefcase,
//     UserCheck,
//     GraduationCap,
//     MessageSquare,
//     Globe,
// } from "lucide-react";

// export const sidebarData = {
//     navMain: [
//         {
//             title: "General",
//             items: [
//                 {
//                     title: "Dashboard",
//                     url: "/dashboard",
//                     icon: LayoutDashboard,
//                     badge: "New",
//                 },
//             ],
//         },
//         {
//             title: "User Management",
//             items: [
//                 {
//                     title: "Users",
//                     url: "/dashboard/users",
//                     icon: Users,
//                 },
//                 {
//                     title: "Team",
//                     icon: UserCheck,
//                     isCollapsible: true,
//                     items: [
//                         {
//                             title: "All Team Members",
//                             url: "/dashboard/teams",
//                             icon: UserCheck,
//                         },
//                         {
//                             title: "Team Categories",
//                             url: "/dashboard/teams/categories",
//                             icon: FolderKanban,
//                         },
//                     ],
//                 },
//             ],
//         },

//     ],
// };


import {
    LayoutDashboard,
    Key,
    Utensils,
    Pill,
    ShieldCheck,
    AlertTriangle,
} from "lucide-react";

export const sidebarData = {
    navMain: [
        {
            title: "General",
            items: [
                {
                    title: "Dashboard",
                    url: "/dashboard",
                    icon: LayoutDashboard,
                    badge: "New",
                },
            ],
        },
        {
            title: "Management",
            items: [
                {
                    title: "API Keys",
                    url: "/dashboard/api-keys",
                    icon: Key,
                },
                {
                    title: "Food",
                    url: "/dashboard/food",
                    icon: Utensils,
                },
                {
                    title: "Medication",
                    url: "/dashboard/medication",
                    icon: Pill,
                },
                {
                    title: "Permissions",
                    url: "/dashboard/permissions",
                    icon: ShieldCheck,
                },
                {
                    title: "Side Effects",
                    url: "/dashboard/side-effects",
                    icon: AlertTriangle,
                },
            ],
        },

    ],
};