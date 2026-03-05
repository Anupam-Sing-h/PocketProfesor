"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [isRotating, setIsRotating] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    const handleToggle = () => {
        setIsRotating(true);
        setTheme(theme === "dark" ? "light" : "dark");
        setTimeout(() => setIsRotating(false), 500);
    };

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-9 w-9">
                <span className="sr-only">Toggle theme</span>
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            onClick={handleToggle}
            aria-label="Toggle theme"
        >
            <span className={`theme-icon ${isRotating ? 'rotating' : ''}`}>
                <Sun
                    className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
                />
                <Moon
                    className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
                />
            </span>
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
