"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Settings,
    User,
    ChevronDown,
    ChevronRight,
    LogOut,
    Crown,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuBadge,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { sidebarData } from "@/components/menu-items";
import { useAuth } from "@/hooks/use-auth";

export function AdminSidebar(props) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const isParentActive = (item) =>
        item.isCollapsible && item.items
            ? item.items.some((subItem) => pathname === subItem.url)
            : pathname === item.url;

    const shouldBeOpen = (item) =>
        item.isCollapsible && item.items
            ? item.items.some((subItem) => pathname === subItem.url)
            : false;

    return (
        <Sidebar variant="inset" className="border-r-0" {...props}>
            {/* Header */}
            <SidebarHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-primary/10 transition-all duration-200"
                        >
                            <a href="/admin" className="nunito-text flex items-center gap-2">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
                                    <LayoutDashboard className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-bold text-foreground">
                                        Admin Panel
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Crown className="size-3 text-amber-600" />
                                        <span className="truncate text-xs font-medium text-amber-600">
                                            ADMIN
                                        </span>
                                    </div>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent className="px-2">
                {sidebarData.navMain.map((section) => (
                    <SidebarGroup key={section.title} className="py-2">
                        <SidebarGroupLabel className="nunito-text text-xs font-bold text-muted-foreground/80 uppercase tracking-wider px-2 mb-2">
                            {section.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-1">
                                {section.items.map((item) => {
                                    if (item.isCollapsible && item.items) {
                                        return (
                                            <Collapsible
                                                key={item.title}
                                                asChild
                                                defaultOpen={shouldBeOpen(item)}
                                                className="group/collapsible"
                                            >
                                                <SidebarMenuItem>
                                                    <CollapsibleTrigger asChild>
                                                        <SidebarMenuButton
                                                            tooltip={item.title}
                                                            isActive={isParentActive(item)}
                                                            className="nunito-text font-medium hover:bg-primary/10 hover:text-primary transition-all duration-200 group-data-[state=open]/collapsible:bg-primary/5 group-data-[state=open]/collapsible:text-primary rounded-lg"
                                                        >
                                                            <item.icon className="size-4" />
                                                            <span>{item.title}</span>
                                                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                        </SidebarMenuButton>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <SidebarMenuSub className="ml-4 mt-1 space-y-1">
                                                            {item.items.map((subItem) => (
                                                                <SidebarMenuSubItem key={subItem.title}>
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={pathname === subItem.url}
                                                                        className="nunito-text hover:bg-primary/10 hover:text-primary transition-all duration-200 rounded-md"
                                                                    >
                                                                        <a
                                                                            href={subItem.url}
                                                                            className="flex items-center gap-2"
                                                                        >
                                                                            <subItem.icon className="size-4" />
                                                                            <span>{subItem.title}</span>
                                                                        </a>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            ))}
                                                        </SidebarMenuSub>
                                                    </CollapsibleContent>
                                                </SidebarMenuItem>
                                            </Collapsible>
                                        );
                                    }

                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={pathname === item.url}
                                                className="nunito-text font-medium hover:bg-primary/10 hover:text-primary transition-all duration-200 rounded-lg"
                                            >
                                                <a href={item.url} className="flex items-center gap-2">
                                                    <item.icon className="size-4" />
                                                    <span>{item.title}</span>
                                                </a>
                                            </SidebarMenuButton>
                                            {item.badge && (
                                                <SidebarMenuBadge className="bg-primary/10 text-primary text-xs font-medium">
                                                    {item.badge}
                                                </SidebarMenuBadge>
                                            )}
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter className="border-t bg-gradient-to-r from-muted/30 to-muted/50 p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="nunito-text hover:bg-primary/10 transition-all duration-200 data-[state=open]:bg-primary/10 data-[state=open]:text-primary rounded-lg"
                                >
                                    <div className="relative">
                                        <Avatar className="h-8 w-8 rounded-lg border-2 border-primary/20">
                                            <AvatarImage
                                                src={user?.image || "/placeholder.svg"}
                                                alt={user?.name || "User"}
                                            />
                                            <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                                                {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1">
                                            <Crown className="size-3 text-amber-600 bg-background rounded-full p-0.5" />
                                        </div>
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold text-foreground">
                                            {user?.name || "Admin"}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {user?.email || "admin@example.com"}
                                        </span>
                                    </div>
                                    <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg shadow-lg border nunito-text"
                                side="bottom"
                                align="end"
                                sideOffset={4}
                            >
                                <div className="p-2 border-b">
                                    <Badge
                                        variant="secondary"
                                        className="text-amber-600 bg-primary/10 font-medium"
                                    >
                                        ADMIN
                                    </Badge>
                                </div>
                                <DropdownMenuItem
                                    asChild
                                    className="hover:bg-primary/10 transition-colors"
                                >
                                    <a href="/admin/account" className="flex items-center gap-2">
                                        <User className="size-4" />
                                        Account Settings
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    asChild
                                    className="hover:bg-primary/10 transition-colors"
                                >
                                    <a href="/admin/settings" className="flex items-center gap-2">
                                        <Settings className="size-4" />
                                        Preferences
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={logout}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                                >
                                    <LogOut className="size-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
