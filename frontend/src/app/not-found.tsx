import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 page-enter">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
                <FileQuestion className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">Page Not Found</h1>
            <p className="text-muted-foreground text-lg max-w-md mb-8">
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Button asChild size="lg">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                </Link>
            </Button>
        </div>
    );
}
