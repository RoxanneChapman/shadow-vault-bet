import { Lock, TrendingUp, TrendingDown, Clock, Key, Trophy } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import PlaceBetDialog from "./PlaceBetDialog";
import RoundResultDialog from "./RoundResultDialog";
import { useEncryptedBet } from "@/hooks/useEncryptedBet";

interface BetRoundCardProps {
  roundId: number;
  name: string;
  endTime: bigint;
  participantCount: bigint;
  resolved: boolean;
  encrypted: boolean;
  onRefresh?: () => void;
}

interface RoundResult {
  yesAmount: number;
  noAmount: number;
  totalAmount: number;
  winner: "yes" | "no" | null;
  userWon: boolean;
  userReward: number;
  hasClaimed: boolean;
}

const BetRoundCard = ({
  roundId,
  name,
  endTime,
  participantCount,
  resolved,
  encrypted,
  onRefresh,
}: BetRoundCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [betDialogOpen, setBetDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const dialogCloseRequestedRef = useRef(false); // Track if user explicitly requested close
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const { isConnected, address } = useAccount();
  const { toast } = useToast();
  const { decryptAmount, getEncryptedAmounts, hasParticipated, getUserBet, getRoundTotalPool, claimReward } = useEncryptedBet();

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      // Handle both bigint and number types
      const end = typeof endTime === 'bigint' ? Number(endTime) : Number(endTime || 0);
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining("Ended");
        return;
      }

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const handlePlaceBet = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to place bets",
        variant: "destructive",
      });
      return;
    }
    const end = typeof endTime === 'bigint' ? Number(endTime) : Number(endTime || 0);
    if (resolved || end <= Math.floor(Date.now() / 1000)) {
      toast({
        title: "Round Not Available",
        description: "This round has ended or been resolved",
        variant: "destructive",
      });
      return;
    }
    setBetDialogOpen(true);
  };

  // No automatic decryption - all decryption must be manual

  const handleDecryptAndResolve = async () => {
    setResultDialogOpen(true);
  };

  const handleViewResults = async () => {
    // For resolved rounds, open dialog to decrypt and view results
    setResultDialogOpen(true);
  };

  const handleResultDecrypted = (decryptedResult: RoundResult) => {
    // Update card result when dialog is closed by user
    // Don't do anything that might cause re-render and close dialog
    // Just update the result state silently
    setResult(decryptedResult);
    setDecrypting(false);
    // DO NOT call onRefresh here - it causes parent re-render which closes dialog
  };

  const handleDialogChange = (open: boolean) => {
    // This function is called by RoundResultDialog when onOpenChange is triggered
    // Only allow closing when user explicitly requests it (via X button or Close button)
    if (open) {
      // Dialog is opening - allow it
      dialogCloseRequestedRef.current = false;
      setResultDialogOpen(true);
    } else {
      // Dialog close request received
      // Only close if it's a legitimate user action
      // RoundResultDialog's handleClose will verify this before calling onOpenChange(false)
      // So if we receive false here, it means user clicked X button or Close button
      setResultDialogOpen(false);
      onRefresh?.();
    }
  };

  const handleClaimReward = async () => {
    if (!result || !address || !isConnected) return;

    try {
      const rewardAmountWei = BigInt(Math.floor(result.userReward * 1e18));
      const winningSide = result.winner === "yes";
      
      // Get user bet info from localStorage
      const betKey = `bet_${roundId}_${address}`;
      const storedBet = localStorage.getItem(betKey);
      if (!storedBet) return;

      const betData = JSON.parse(storedBet);
      const userBetAmountInUnits = betData.amountInUnits || 0;
      const userChoice = betData.choice === true;
      const winningSideTotalInUnits = winningSide ? result.yesAmount * 1000 : result.noAmount * 1000; // Convert back to units

      await claimReward(
        roundId,
        rewardAmountWei.toString(),
        userBetAmountInUnits,
        userChoice,
        winningSide,
        winningSideTotalInUnits
      );

      toast({
        title: "Reward Claimed",
        description: `Successfully claimed ${result.userReward.toFixed(6)} ETH`,
      });

      setResult({
        ...result,
        hasClaimed: true,
      });
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    }
  };

  const end = typeof endTime === 'bigint' ? Number(endTime) : Number(endTime || 0);
  const isEnded = end <= Math.floor(Date.now() / 1000) || resolved;

  return (
    <div
      className="bg-card rounded-xl border border-border/50 p-6 hover:border-primary/50 transition-all duration-300 neon-glow relative overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-orbitron font-bold mb-2">
              {name || `Round #${roundId}`}
            </h3>
            <p className="text-sm text-muted-foreground">Round #{roundId}</p>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-orbitron">{timeRemaining}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>
              {typeof participantCount === 'bigint' 
                ? participantCount.toString() 
                : (participantCount || 0)} participants
            </span>
          </div>
        </div>

        {/* Display decrypted results if available */}
        {resolved && result && (
          <div className="mb-4 space-y-3 p-4 bg-card border border-border/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-accent" />
              <span className="font-orbitron font-bold text-lg">
                Winner: {result.winner ? result.winner.toUpperCase() : "TIE"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-primary/30 rounded p-2">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-orbitron font-bold">YES</span>
                </div>
                <p className="text-sm font-orbitron text-primary">
                  {result.yesAmount.toFixed(4)} ETH
                </p>
              </div>
              <div className="bg-card border border-secondary/30 rounded p-2">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-orbitron font-bold">NO</span>
                </div>
                <p className="text-sm font-orbitron text-secondary">
                  {result.noAmount.toFixed(4)} ETH
                </p>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground font-orbitron">
              Total Pool: {result.totalAmount.toFixed(4)} ETH
            </div>

            {result.userWon && result.userReward > 0 && (
              <div className="mt-3 p-3 bg-accent/20 border border-accent/50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-orbitron text-muted-foreground">Your Reward</span>
                  <span className="text-sm font-orbitron font-bold text-accent">
                    {result.userReward.toFixed(6)} ETH
                  </span>
                </div>
                {!result.hasClaimed && (
                  <button
                    onClick={handleClaimReward}
                    className="w-full mt-2 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-accent via-primary to-secondary text-primary-foreground font-orbitron font-bold hover:opacity-90 transition-opacity"
                  >
                    Claim Reward
                  </button>
                )}
                {result.hasClaimed && (
                  <p className="text-xs text-muted-foreground text-center mt-2">Reward claimed</p>
                )}
              </div>
            )}
          </div>
        )}

        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock
              className={`w-5 h-5 ${
                encrypted ? "text-accent" : "text-muted-foreground"
              } ${isHovered ? "animate-lock" : ""}`}
            />
            <span className="text-sm font-orbitron">
              {encrypted ? "Encrypted" : "Revealed"}
            </span>
            {isEnded && (
              <span className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive font-orbitron">
                {resolved ? "Resolved" : "Ended"}
              </span>
            )}
          </div>
          
          {!isEnded && (
            <button 
              onClick={handlePlaceBet}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground font-orbitron font-bold hover:opacity-90 transition-opacity neon-glow-strong"
            >
              Place Bet
            </button>
          )}
          {isEnded && !resolved && (
            <button 
              onClick={handleDecryptAndResolve}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent via-primary to-secondary text-primary-foreground font-orbitron font-bold hover:opacity-90 transition-opacity neon-glow-strong flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Decrypt & Resolve
            </button>
          )}
          {isEnded && resolved && !result && (
            <button 
              onClick={handleViewResults}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground font-orbitron font-bold hover:opacity-90 transition-opacity neon-glow-strong flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              View Results
            </button>
          )}
        </div>
      </div>

      <PlaceBetDialog
        open={betDialogOpen}
        onOpenChange={setBetDialogOpen}
        roundId={roundId}
        roundName={name}
      />

      <RoundResultDialog
        open={resultDialogOpen}
        onOpenChange={handleDialogChange}
        roundId={roundId}
        roundName={name}
        resolved={resolved}
        onResultDecrypted={handleResultDecrypted}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </div>
  );
};

export default BetRoundCard;


