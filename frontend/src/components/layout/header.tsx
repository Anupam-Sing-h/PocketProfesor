"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const pageTitles: Record<string, string> = {
    "/": "Home",
    "/library": "Content Library",
};

function getPageTitle(pathname: string): string {
    // Exact match
    if (pageTitles[pathname]) return pageTitles[pathname];

    // Dynamic study routes
    if (pathname.match(/^\/study\/[^/]+\/flashcards$/)) return "Flashcards";
    if (pathname.match(/^\/study\/[^/]+\/quiz$/)) return "Quiz";
    if (pathname.match(/^\/study\/[^/]+\/chat$/)) return "Chat with Content";
    if (pathname.match(/^\/study\/[^/]+$/)) return "Study Dashboard";

    return "LearnAI";
}

export function Header() {
    const pathname = usePathname();
    const title = getPageTitle(pathname);

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <h1 className="text-sm font-semibold">{title}</h1>
            <div className="ml-auto">
                <ThemeToggle />
            </div>
        </header>
    );
}
