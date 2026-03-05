import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 page-enter">
            <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
            </div>
            <div className="space-y-4 w-full max-w-md px-4">
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
        </div>
    );
}
