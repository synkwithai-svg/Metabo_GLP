"use client";

import Link from "next/link";
import { Ellipsis, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { getMenuList } from "@/components/dashboard/menu-list";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapseMenuButton } from "@/components/dashboard/collapse-menu-button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

interface MenuProps {
  isOpen: boolean | undefined;
}

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const menuList = getMenuList(pathname);
  const {logout } = useAuth();

  return (
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="mt-8 h-full w-full">
        <ul
          className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] 
                     lg:min-h-[calc(100vh-32px-40px-32px)] items-start 
                     space-y-1 px-2"
        >
          {menuList.map(({ groupLabel, menus }, index) => (
            <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
              {/* Group Label */}
              {(isOpen && groupLabel) || isOpen === undefined ? (
                <p className="text-sm font-medium text-muted-foreground px-4 pb-2 truncate">
                  {groupLabel}
                </p>
              ) : !isOpen && groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className="w-full flex justify-center">
                      <Ellipsis className="h-5 w-5" />
                    </TooltipTrigger>
                    <TooltipContent side="right">{groupLabel}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2" />
              )}

              {/* Menus */}
              {menus.map(({ href, label, icon: Icon, submenus }, idx) =>
                !submenus ? (
                  <div className="w-full" key={idx}>
                    <TooltipProvider disableHoverableContent>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={
                              pathname.startsWith(href) ? "secondary" : "ghost"
                            }
                            className="w-full justify-start h-10 mb-1"
                            asChild
                          >
                            <Link href={href}>
                              <span className={cn(isOpen ? "mr-4" : "")}>
                                <Icon size={18} />
                              </span>
                              <p
                                className={cn(
                                  "truncate",
                                  isOpen === false
                                    ? "opacity-0 hidden"
                                    : "opacity-100"
                                )}
                              >
                                {label}
                              </p>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        {!isOpen && (
                          <TooltipContent side="right">{label}</TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <CollapseMenuButton
                    key={idx}
                    icon={Icon}
                    label={label}
                    active={pathname.startsWith(href)}
                    submenus={submenus}
                    isOpen={isOpen}
                  />
                )
              )}
            </li>
          ))}

          {/* Logout (UI only) */}
          <li className="w-full grow flex items-end">
            <TooltipProvider disableHoverableContent>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={logout}
                    className="w-full justify-center h-10 mt-5"
                  >
                    <LogOut size={18} />
                    {isOpen && <span className="ml-4">Sign out</span>}
                  </Button>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right">Sign out</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </li>
        </ul>
      </nav>
    </ScrollArea>
  );
}
