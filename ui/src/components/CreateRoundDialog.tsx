import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEncryptedBet } from "@/hooks/useEncryptedBet";
import { useAccount } from "wagmi";

interface CreateRoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CreateRoundDialog = ({ open, onOpenChange, onSuccess }: CreateRoundDialogProps) => {
  const [roundName, setRoundName] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { createRound } = useEncryptedBet();
  const { isConnected } = useAccount();

  const handleCreate = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a round",
        variant: "destructive",
      });
      return;
    }

    if (!roundName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter a round name",
        variant: "destructive",
      });
      return;
    }

    if (!endTime) {
      toast({
        title: "Invalid End Time",
        description: "Please select an end time",
        variant: "destructive",
      });
      return;
    }

    const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);
    if (endTimestamp <= Math.floor(Date.now() / 1000)) {
      toast({
        title: "Invalid End Time",
        description: "End time must be in the future",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createRound(roundName, endTimestamp);
      
      toast({
        title: "Round Created",
        description: `Successfully created "${roundName}"`,
      });

      setRoundName("");
      setEndTime("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create round",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    // Only close when explicitly set to false (e.g., clicking X button)
    if (!open) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Create Betting Round
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new encrypted YES/NO betting round
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="roundName" className="font-orbitron">Round Name</Label>
            <Input
              id="roundName"
              placeholder="e.g., Will Bitcoin hit $100k?"
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              className="font-orbitron"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime" className="font-orbitron">End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="font-orbitron"
            />
            <p className="text-xs text-muted-foreground">
              The round will end at this time. You can place bets after creating the round.
            </p>
          </div>

          <Button
            onClick={handleCreate}
            disabled={loading || !isConnected}
            className="w-full bg-gradient-to-r from-primary via-secondary to-accent font-orbitron font-bold neon-glow-strong"
          >
            {loading ? "Creating..." : "Create Round"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoundDialog;


