"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/app-sidebar";
import {
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Separator } from "@/components/ui/separator";
import { Loader2, Menu } from "lucide-react";
import { sidebarData } from "@/components/menu-items";

const findBreadcrumbPath = (items, pathname, trail = []) => {
    for (const item of items) {
        const path = [...trail, item];

        if (item.url === pathname) return path;

        if (item.items) {
            const found = findBreadcrumbPath(item.items, pathname, path);
            if (found) return found;
        }
    }
    return null;
};

const getBreadcrumbsFromSidebar = (pathname) => {
    let foundPath = null;

    sidebarData.navMain.forEach((section) => {
        if (!foundPath) {
            foundPath = findBreadcrumbPath(section.items, pathname);
        }
    });

    const breadcrumbs = [{ label: "Admin", href: "/admin" }];

    if (foundPath) {
        foundPath.forEach((item) => {
            if (item.url) {
                breadcrumbs.push({ label: item.title, href: item.url });
            }
        });
    }

    return breadcrumbs;
};

export default function AdminLayout({ children }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    const breadcrumbs = getBreadcrumbsFromSidebar(pathname);

    useEffect(() => {
        if (status === "loading") return;
        if (!session) {
            router.replace("/login");
            return;
        }

        setIsLoading(false);
    }, [session, status, router]);

    if (status === "loading" || isLoading) {
        return (
            <></>
        );
    }

    return (
        <SidebarProvider>
            <AdminSidebar user={session} />
            <SidebarInset>
                {/* Header */}
                <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center gap-2 px-4 w-full">
                        <SidebarTrigger className="-ml-1 h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" />
                        <Separator orientation="vertical" className="mr-2 h-4" />

                        {/* Breadcrumb */}
                        <Breadcrumb className="flex-1">
                            <BreadcrumbList className="nunito-text">
                                {breadcrumbs.map((crumb, index) => (
                                    <div key={crumb.href} className="flex items-center">
                                        {index > 0 && (
                                            <BreadcrumbSeparator className="text-muted-foreground/50" />
                                        )}
                                        <BreadcrumbItem>
                                            {index === breadcrumbs.length - 1 ? (
                                                <BreadcrumbPage className="text-foreground font-semibold">
                                                    {crumb.label}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink
                                                    href={crumb.href}
                                                    className="text-muted-foreground hover:text-primary transition-colors font-medium"
                                                >
                                                    {crumb.label}
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                    </div>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>

                        {/* Mobile */}
                        <div className="md:hidden flex items-center gap-2 text-xs text-muted-foreground nunito-text">
                            <Menu className="h-4 w-4" />
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex flex-1 flex-col gap-4 p-4 pt-6 lg:gap-6 lg:p-6">
                    <div className="min-h-[calc(100vh-8rem)] flex-1 rounded-xl bg-gradient-to-br from-background via-muted/30 to-primary/5 border shadow-sm overflow-hidden">
                        <div className="container max-w-7xl mx-auto p-6 lg:p-8 h-full">
                            <div className="nunito-text">{children}</div>
                        </div>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
