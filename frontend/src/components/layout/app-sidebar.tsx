"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, GraduationCap } from "lucide-react";
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
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const navItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Library", href: "/library", icon: Library },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            {/* ── Brand ── */}
            <SidebarHeader className="p-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
                        LearnAI
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarSeparator />

            {/* ── Navigation ── */}
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const isActive =
                                    item.href === "/"
                                        ? pathname === "/"
                                        : pathname.startsWith(item.href);

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.href}>
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* ── Footer ── */}
            <SidebarFooter className="p-2">
                <ThemeToggle />
            </SidebarFooter>
        </Sidebar>
    );
}
