// menu-list.ts
import {
  LayoutDashboard,
  Key,
  Utensils,
  Pill,
  ShieldCheck,
  AlertTriangle,
  LucideIcon,
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
};

type Menu = {
  href: string;
  label: string;
  icon: LucideIcon;
  submenus?: Submenu[];
};

export type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "General",
      menus: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      groupLabel: "Management",
      menus: [
        {
          href: "/dashboard/api-keys",
          label: "API Keys",
          icon: Key,
        },
        {
          href: "/dashboard/food",
          label: "Food",
          icon: Utensils,
        },
        {
          href: "/dashboard/medication",
          label: "Medication",
          icon: Pill,
        },
        {
          href: "/dashboard/permissions",
          label: "Permissions",
          icon: ShieldCheck,
        },
        {
          href: "/dashboard/side-effects",
          label: "Side Effects",
          icon: AlertTriangle,
        },
      ],
    },
  ];
}
