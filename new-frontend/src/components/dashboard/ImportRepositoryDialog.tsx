import { useState } from "react";
import { Plus, Github } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ImportRepositoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { url: string; title: string; description: string }) => void;
  isImporting: boolean;
}

export function ImportRepositoryDialog({
  isOpen,
  onOpenChange,
  onImport,
  isImporting,
}: ImportRepositoryDialogProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [repoTitle, setRepoTitle] = useState("");
  const [repoDescription, setRepoDescription] = useState("");

  const handleSubmit = () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a repository URL");
      return;
    }

    // Validate GitHub URL format
    const ghRepoRegex = /https?:\/\/(www\.)?github.com\/[\w.-]+\/[\w.-]+/;
    if (!ghRepoRegex.test(repoUrl)) {
      toast.error("Please enter a valid GitHub repository URL");
      return;
    }

    onImport({ url: repoUrl, title: repoTitle, description: repoDescription });
  };

  const handleClose = () => {
    onOpenChange(false);
    setRepoUrl("");
    setRepoTitle("");
    setRepoDescription("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import GitHub Repository
          </DialogTitle>
          <DialogDescription>
            Enter the GitHub repository URL you want to import and analyze.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="repo-url" className="text-sm font-medium">
              Repository URL <span className="text-destructive">*</span>
            </label>
            <Input
              id="repo-url"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Make sure the repository is public or you have access to it.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="repo-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="repo-title"
              placeholder="My Awesome Project"
              value={repoTitle}
              onChange={(e) => setRepoTitle(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="repo-description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="repo-description"
              placeholder="A brief description of your project"
              value={repoDescription}
              onChange={(e) => setRepoDescription(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isImporting}>
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
