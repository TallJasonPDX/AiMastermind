
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VolumeIcon, BookmarkIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface AudioModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onExit: () => void;
}

export function AudioModal({ isOpen, onConfirm, onExit }: AudioModalProps) {
  const queryClient = useQueryClient();

  const handleConfirm = () => {
    sessionStorage.setItem('audioConfirmed', 'true');
    queryClient.setQueryData(['audioConfirmed'], true);
    onConfirm();
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to West Linn AI Mastermind</DialogTitle>
          <DialogDescription>
            To use this page you must have sound enabled. Please confirm your audio is turned on, or bookmark and come back later.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-6">
          <VolumeIcon className="h-12 w-12 text-primary" />
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onExit}
            className="w-full sm:w-auto"
          >
            <BookmarkIcon className="mr-2 h-4 w-4" />
            Bookmark & Exit
          </Button>
          <Button 
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            Confirm Audio Enabled
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
