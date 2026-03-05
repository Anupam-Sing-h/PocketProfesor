"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Library as LibraryIcon, Youtube, FileText, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Content } from "@/types";

export default function LibraryPage() {
    const router = useRouter();

    const [contents, setContents] = useState<Content[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchContents();
    }, []);

    // Poll if there are any contents currently processing
    useEffect(() => {
        const hasProcessing = contents.some(c => c.status === "processing");
        if (!hasProcessing) return;

        const interval = setInterval(() => {
            fetchContents(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [contents]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchContents = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const response = await api.getContents();
            setContents(response.contents);
        } catch (error) {
            if (showLoading) {
                toast.error("Failed to fetch library", { description: error instanceof Error ? error.message : "Unknown error" });
            }
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!contentToDelete) return;

        setIsDeleting(true);
        try {
            await api.deleteContent(contentToDelete.id);
            setContents(contents.filter(c => c.id !== contentToDelete.id));
            toast.success("Content deleted successfully");
        } catch (error) {
            toast.error("Failed to delete content", { description: error instanceof Error ? error.message : "Unknown error" });
        } finally {
            setIsDeleting(false);
            setContentToDelete(null);
        }
    };

    const filteredContents = contents.filter((content) => {
        const matchesSearch = content.title.toLowerCase().includes(debouncedQuery.toLowerCase());
        const matchesTab = activeTab === "all" || content.source_type === activeTab;
        return matchesSearch && matchesTab;
    });

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-12 pt-6 px-4 md:px-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage and review your processed materials</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-3 md:w-auto md:flex">
                        <TabsTrigger value="all">All Content</TabsTrigger>
                        <TabsTrigger value="youtube" className="flex gap-2">
                            <Youtube className="h-4 w-4" />
                            <span className="hidden sm:inline">YouTube</span>
                        </TabsTrigger>
                        <TabsTrigger value="pdf" className="flex gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">PDF</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search content..."
                        className="pl-9 bg-background/50 focus:bg-background transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <PageLoading count={6} />
            ) : contents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl glass mt-8">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-6 text-primary">
                        <LibraryIcon className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Your library is empty</h2>
                    <p className="text-muted-foreground max-w-md mb-6">
                        Upload a YouTube video or PDF from the Home page to start building
                        your study materials.
                    </p>
                    <Button onClick={() => router.push('/')} size="lg">Upload Your First Content</Button>
                </div>
            ) : filteredContents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                        <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold">No results found</h2>
                    <p className="mt-2 text-muted-foreground">Try adjusting your search query or filters.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
                    {filteredContents.map((content) => (
                        <Card
                            key={content.id}
                            className="glass group relative flex flex-col overflow-hidden transition-all duration-300 hover:glow-border hover:shadow-lg hover:-translate-y-1"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                            <div
                                className="absolute right-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8 rounded-full shadow-md backdrop-blur-md bg-destructive/80 hover:bg-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setContentToDelete(content);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div
                                className="flex-1 p-5 cursor-pointer flex flex-col"
                                onClick={() => router.push(`/study/${content.id}`)}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-inner ${content.source_type === 'youtube' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {content.source_type === 'youtube' ? <Youtube className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant="outline" className={`font-medium capitalize ${content.status === 'ready' ? 'text-green-500 border-green-500/30 bg-green-500/5' : content.status === 'processing' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' : 'text-red-500 border-red-500/30 bg-red-500/5'}`}>
                                            {content.status}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {new Date(content.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                    {content.title}
                                </h3>

                                {content.source_type === 'youtube' && content.thumbnail_url && (
                                    <div className="mt-auto pt-4 relative">
                                        <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted relative">
                                            {/* Using standard img to avoid next/image domain config issues */}
                                            <Image
                                                src={content.thumbnail_url}
                                                alt={content.title}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                unoptimized
                                            />
                                            <div className="absolute top-2 left-2">
                                                <Badge variant="secondary" className="bg-black/60 text-white hover:bg-black/60 backdrop-blur-md border-0 uppercase text-[10px]">
                                                    YouTube
                                                </Badge>
                                            </div>
                                            {content.duration && (
                                                <div className="absolute bottom-2 right-2">
                                                    <Badge variant="secondary" className="bg-black/60 text-white hover:bg-black/60 backdrop-blur-md border-0 text-[10px]">
                                                        {content.duration}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {content.source_type === 'pdf' && (
                                    <div className="mt-auto pt-4">
                                        <div className="h-32 w-full overflow-hidden rounded-lg bg-muted text-muted-foreground flex flex-col gap-2 items-center justify-center relative border border-dashed hover:bg-muted/50 transition-colors">
                                            <FileText className="h-8 w-8 opacity-50" />
                                            <span className="text-xs font-medium">PDF Document</span>
                                            {content.page_count && (
                                                <div className="absolute bottom-2 right-2">
                                                    <Badge variant="secondary" className="bg-background/80 text-foreground backdrop-blur-md text-[10px]">
                                                        {content.page_count} Pages
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!contentToDelete} onOpenChange={(open) => !open && setContentToDelete(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Content</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{contentToDelete?.title}&quot;? This action cannot be undone and will remove all generated flashcards, quizzes, and chat history.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end gap-2 mt-4 mt:0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setContentToDelete(null)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
