import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEncryptedBet } from "@/hooks/useEncryptedBet";
import { useAccount } from "wagmi";
import { parseEther } from "viem";

interface PlaceBetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: number;
  roundName: string;
  onSuccess?: () => void;
}

const PlaceBetDialog = ({ open, onOpenChange, roundId, roundName, onSuccess }: PlaceBetDialogProps) => {
  const [amount, setAmount] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { placeBet } = useEncryptedBet();
  const { isConnected, address } = useAccount();

  const handlePlaceBet = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to place bets",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 使用 ETH 金额，转换为整数单位用于加密（1 ETH = 1000 单位，可根据需要调整）
      const ethValue = parseFloat(amount);
      if (isNaN(ethValue) || ethValue <= 0) {
        throw new Error("Invalid ETH amount");
      }
      
      const betAmount = Math.floor(ethValue * 1000); // 将 ETH 转换为整数单位
      if (betAmount <= 0) {
        throw new Error("Bet amount must be greater than 0");
      }
      
      const ethValueWei = parseEther(amount).toString();
      console.log('Placing bet with:', {
        roundId,
        betAmount,
        choice: selectedOutcome === "yes",
        ethValue,
        ethValueWei,
      });
      
      await placeBet(roundId, betAmount, selectedOutcome === "yes", ethValueWei);
      
      // Store bet info in localStorage for reward calculation
      if (address) {
        const betKey = `bet_${roundId}_${address}`;
        const betData = {
          amountInUnits: betAmount,
          choice: selectedOutcome === "yes",
          ethAmount: amount,
          timestamp: Date.now(),
        };
        localStorage.setItem(betKey, JSON.stringify(betData));
        console.log('Stored bet info:', betData);
      }
      
      toast({
        title: "Bet Placed",
        description: `Successfully placed bet on "${roundName}"`,
      });

      setAmount("");
      setSelectedOutcome("yes");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Place bet error:', error);
      
      let errorMessage = "Failed to place bet";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // 提供更友好的错误信息
      if (errorMessage.includes("Round already resolved")) {
        errorMessage = "This betting round has already been resolved";
      } else if (errorMessage.includes("Round has ended")) {
        errorMessage = "This betting round has already ended";
      } else if (errorMessage.includes("Round does not exist")) {
        errorMessage = "This betting round does not exist";
      } else if (errorMessage.includes("Must send ETH")) {
        errorMessage = "Please enter a valid ETH amount";
      } else if (errorMessage.includes("execution reverted")) {
        errorMessage = "Transaction failed. Please check if the round is still active and you have sufficient balance.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    // Only close when explicitly set to false (e.g., clicking X button)
    // Don't close on outside click (handled by DialogContent)
    if (!open) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Place Your Bet
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {roundName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="yes" className="w-full" onValueChange={(v) => setSelectedOutcome(v as "yes" | "no")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="yes" className="font-orbitron">
              <TrendingUp className="w-4 h-4 mr-2" />
              YES
            </TabsTrigger>
            <TabsTrigger value="no" className="font-orbitron">
              <TrendingDown className="w-4 h-4 mr-2" />
              NO
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="font-orbitron">Bet Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-orbitron"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Enter your bet amount in ETH. This will be encrypted and sent to the contract.
            </p>
          </div>

          <Button
            onClick={handlePlaceBet}
            disabled={loading || !isConnected}
            className="w-full bg-gradient-to-r from-primary via-secondary to-accent font-orbitron font-bold neon-glow-strong"
          >
            {loading ? "Placing Bet..." : "Confirm Bet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlaceBetDialog;


