import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number; // 0 to 100
    size?: number;
    strokeWidth?: number;
    label?: string;
    sublabel?: string;
    indicatorColor?: string;
    trackColor?: string;
}

export function ProgressRing({
    value,
    size = 120,
    strokeWidth = 10,
    label,
    sublabel,
    indicatorColor = "text-primary",
    trackColor = "text-muted",
    className,
    ...props
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: size, height: size }}
            {...props}
        >
            {/* Background SVG Track */}
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className={cn("absolute inset-0 transform -rotate-90")}
            >
                {/* Track */}
                <circle
                    className={trackColor}
                    stroke="currentColor"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={indicatorColor}
                    stroke="currentColor"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
                />
            </svg>

            {/* Centered Content */}
            {(label || sublabel) && (
                <div className="absolute flex flex-col items-center justify-center text-center">
                    {label && <span className="text-2xl font-bold">{label}</span>}
                    {sublabel && (
                        <span className="text-xs text-muted-foreground">{sublabel}</span>
                    )}
                </div>
            )}
        </div>
    );
}
