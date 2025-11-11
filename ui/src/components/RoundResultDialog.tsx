import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEncryptedBet } from "@/hooks/useEncryptedBet";
import { useAccount } from "wagmi";
import { TrendingUp, TrendingDown, Trophy, Loader2, X } from "lucide-react";
import { formatEther } from "viem";

interface RoundResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: number;
  roundName: string;
  resolved?: boolean;
  onResultDecrypted?: (result: RoundResult) => void;
  onSuccess?: () => void;
}

interface RoundResult {
  yesAmount: number;
  noAmount: number;
  totalAmount: number;
  winner: "yes" | "no" | null;
  userWon: boolean;
  userReward: number;
  userBetAmountInUnits: number;
  userChoice: boolean;
  winningSideTotalInUnits: number;
  totalPoolWei: bigint;
  hasClaimed: boolean;
}

const RoundResultDialog = ({ open, onOpenChange, roundId, roundName, resolved = false, onResultDecrypted, onSuccess }: RoundResultDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);
  // Cache decrypted results to avoid re-decrypting
  const resultCacheRef = useRef<Map<number, RoundResult>>(new Map());
  const { toast } = useToast();
  const { 
    resolveRound, 
    decryptAmount, 
    getEncryptedAmounts, 
    hasParticipated, 
    authorizeParticipant,
    getUserBet,
    getRoundTotalPool,
    claimReward
  } = useEncryptedBet();
  const { isConnected, address } = useAccount();
  const [claiming, setClaiming] = useState(false);

  const loadDecryptedResults = useCallback(async () => {
    setDecrypting(true);
    setLoading(true);
    try {
      // Note: If round is resolved, amounts should be publicly decryptable
      // If authorization is still needed, try to authorize the current user
      if (address) {
        try {
          const participated = await hasParticipated(roundId, address);
          if (participated) {
            console.log('Attempting to authorize user for decryption (if needed)...');
            // Try to authorize - this will fail silently if amounts are already public
            await authorizeParticipant(roundId, address);
            console.log('User authorized for decryption');
            // Wait a bit for the transaction to be mined
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (authError: any) {
          console.warn('Authorization step (amounts may already be public):', authError.message);
          // Continue - amounts might already be publicly decryptable
        }
      }

      // Get encrypted amounts
      const encryptedAmounts = await getEncryptedAmounts(roundId);
      
      if (!encryptedAmounts) {
        throw new Error("Failed to get encrypted amounts");
      }

      // Decrypt amounts
      const [yesAmount, noAmount, totalAmount] = await Promise.all([
        decryptAmount(encryptedAmounts.yesAmount).catch(err => {
          console.error('Failed to decrypt yesAmount:', err);
          throw new Error(`Failed to decrypt YES amount: ${err.message}`);
        }),
        decryptAmount(encryptedAmounts.noAmount).catch(err => {
          console.error('Failed to decrypt noAmount:', err);
          throw new Error(`Failed to decrypt NO amount: ${err.message}`);
        }),
        decryptAmount(encryptedAmounts.totalAmount).catch(err => {
          console.error('Failed to decrypt totalAmount:', err);
          throw new Error(`Failed to decrypt total amount: ${err.message}`);
        }),
      ]);

      // Convert from encrypted units to ETH (1 ETH = 1000 units)
      const yesAmountETH = yesAmount / 1000;
      const noAmountETH = noAmount / 1000;
      const totalAmountETH = totalAmount / 1000;

      // Determine winner
      const winner = yesAmountETH > noAmountETH ? "yes" : noAmountETH > yesAmountETH ? "no" : null;

      // Get user bet info and calculate reward
      let userWon = false;
      let userReward = 0;
      let userBetAmountInUnits = 0;
      let userChoice = false;
      let winningSideTotalInUnits = 0;
      let totalPoolWei = BigInt(0);
      let hasClaimed = false;
      
      if (address && winner) {
        const participated = await hasParticipated(roundId, address);
        if (participated) {
          // Get user bet info from contract
          const userBetInfo = await getUserBet(roundId, address);
          const totalPool = await getRoundTotalPool(roundId);
          
          if (userBetInfo && totalPool) {
            totalPoolWei = totalPool;
            hasClaimed = userBetInfo.hasClaimed;
            
            // Get user's bet info from localStorage (stored when placing bet)
            const betKey = `bet_${roundId}_${address}`;
            const storedBet = localStorage.getItem(betKey);
            
            if (storedBet) {
              try {
                const betData = JSON.parse(storedBet);
                userBetAmountInUnits = betData.amountInUnits || 0;
                userChoice = betData.choice === true; // true = YES, false = NO
                
                // Check if user won
                const winningSide = winner === "yes";
                userWon = userChoice === winningSide;
                
                if (userWon) {
                  // Calculate reward: (userBetAmountInUnits / winningSideTotalInUnits) * totalPool
                  winningSideTotalInUnits = winningSide ? yesAmount : noAmount;
                  
                  if (winningSideTotalInUnits > 0) {
                    // Convert totalPool from wei to ETH, then calculate
                    const totalPoolETH = Number(totalPool) / 1e18;
                    userReward = (userBetAmountInUnits / winningSideTotalInUnits) * totalPoolETH;
                  }
                }
              } catch (e) {
                console.error('Failed to parse stored bet data:', e);
              }
            }
          }
        }
      }

      const decryptedResult: RoundResult = {
        yesAmount: yesAmountETH,
        noAmount: noAmountETH,
        totalAmount: totalAmountETH,
        winner,
        userWon,
        userReward,
        userBetAmountInUnits,
        userChoice,
        winningSideTotalInUnits,
        totalPoolWei,
        hasClaimed,
      };
      
      // Cache the result to avoid re-decrypting
      resultCacheRef.current.set(roundId, decryptedResult);
      setResult(decryptedResult);
      
      // Don't notify parent immediately - let user view results first
      // onResultDecrypted will be called when user closes the dialog
    } catch (error: any) {
      console.error('Load results error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load decrypted results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDecrypting(false);
    }
  }, [roundId, address, getEncryptedAmounts, decryptAmount, hasParticipated, authorizeParticipant, getUserBet, getRoundTotalPool, toast]);

  // Load results when dialog opens - only when user explicitly opens it
  useEffect(() => {
    if (!open) {
      // Dialog closed, reset loading states but keep result
      setLoading(false);
      setDecrypting(false);
      setResolving(false);
      return;
    }
    
    // Only decrypt when dialog is opened by user
    if (resolved) {
      // Check cache first
      const cached = resultCacheRef.current.get(roundId);
      if (cached) {
        console.log('Using cached result for round', roundId);
        setResult(cached);
        return;
      }
      
      // Only decrypt if not currently loading/decrypting and no result yet
      if (!loading && !decrypting && !result) {
        console.log('Loading decrypted results for round', roundId);
        loadDecryptedResults();
      }
    } else {
      // Round not resolved yet, clear result if exists
      if (result) {
        setResult(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // ONLY react to open/close - don't add other deps to prevent re-triggering

  const handleResolve = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to resolve the round",
        variant: "destructive",
      });
      return;
    }

    setResolving(true);
    setLoading(true);
    try {
      // Step 1: Resolve the round
      await resolveRound(roundId);
      
      toast({
        title: "Round Resolved",
        description: "Round has been resolved. Decrypting amounts...",
      });

      // Step 2: Load decrypted results
      await loadDecryptedResults();

      // Get the result that was just set
      const currentResult = resultCacheRef.current.get(roundId);
      const winnerText = currentResult?.winner ? currentResult.winner.toUpperCase() : "Tie";
      
      toast({
        title: "Decryption Complete",
        description: `Winner: ${winnerText}`,
      });

      // Keep dialog open - user can view results and close manually
    } catch (error: any) {
      console.error('Resolve error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resolve round",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setResolving(false);
      setDecrypting(false);
    }
  };

  const handleClaimReward = async () => {
    if (!result || !address || !isConnected) return;

    setClaiming(true);
    try {
      const rewardAmountWei = BigInt(Math.floor(result.userReward * 1e18));
      const winningSide = result.winner === "yes";
      
      await claimReward(
        roundId,
        rewardAmountWei.toString(),
        result.userBetAmountInUnits,
        result.userChoice,
        winningSide,
        result.winningSideTotalInUnits
      );

      toast({
        title: "Reward Claimed",
        description: `Successfully claimed ${result.userReward.toFixed(6)} ETH`,
      });

      // Update result to mark as claimed
      const updatedResult = {
        ...result,
        hasClaimed: true,
      };
      setResult(updatedResult);
      // Update cache as well
      resultCacheRef.current.set(roundId, updatedResult);
      
      // Don't auto-close after claiming - let user close manually
    } catch (error: any) {
      console.error('Claim reward error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleClose = (open: boolean) => {
    // This is called when Dialog's onOpenChange is triggered
    // COMPLETELY IGNORE all close requests from this function
    // We don't want ANY automatic closing - only manual close via Close button
    // X button is disabled - user must use Close button
    
    if (!open) {
      // Something is trying to close - COMPLETELY IGNORE IT
      console.log('Close request in handleClose completely ignored - preventing all auto-close');
      // Do NOT call onOpenChange(false) - keep dialog open
      // The dialog will ONLY close via handleCloseButton (user clicks Close button)
    }
  };
  
  const handleCloseButton = () => {
    // User explicitly clicked Close button - this is the ONLY way to close
    if (result && onResultDecrypted) {
      onResultDecrypted(result);
    }
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Round Results
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {roundName}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 mt-4">
            <div className="text-center py-8">
              {resolving && (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground font-orbitron">
                    Resolving round...
                  </p>
                </div>
              )}
              {decrypting && (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-accent" />
                  <p className="text-muted-foreground font-orbitron">
                    Decrypting amounts...
                  </p>
                </div>
              )}
              {!resolving && !decrypting && !resolved && (
                <div className="space-y-4">
                  <p className="text-muted-foreground font-orbitron mb-4">
                    Click the button below to resolve this round and decrypt the results.
                  </p>
                  <Button
                    onClick={handleResolve}
                    disabled={loading || !isConnected}
                    className="bg-gradient-to-r from-primary via-secondary to-accent font-orbitron font-bold neon-glow-strong"
                  >
                    {loading ? "Processing..." : "Resolve & Decrypt"}
                  </Button>
                </div>
              )}
              {!resolving && !decrypting && resolved && (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-accent" />
                  <p className="text-muted-foreground font-orbitron">
                    Loading results...
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Winner Display */}
            <div className="text-center py-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-lg border border-primary/20">
              <Trophy className="w-12 h-12 mx-auto mb-2 text-accent" />
              <h3 className="text-2xl font-orbitron font-bold mb-2">
                Winner: {result.winner ? result.winner.toUpperCase() : "TIE"}
              </h3>
            </div>

            {/* Amounts Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-orbitron font-bold">YES</span>
                </div>
                <p className="text-2xl font-orbitron text-primary">
                  {result.yesAmount.toFixed(4)} ETH
                </p>
              </div>
              <div className="bg-card border border-border/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-secondary" />
                  <span className="font-orbitron font-bold">NO</span>
                </div>
                <p className="text-2xl font-orbitron text-secondary">
                  {result.noAmount.toFixed(4)} ETH
                </p>
              </div>
            </div>

            {/* Total Pool */}
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1 font-orbitron">
                Total Pool
              </p>
              <p className="text-xl font-orbitron font-bold">
                {result.totalAmount.toFixed(4)} ETH
              </p>
            </div>

            {/* User Result */}
            {result.userWon && result.userReward > 0 && (
              <div className="bg-accent/20 border border-accent/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-orbitron">
                    Your Reward
                  </p>
                  <p className="text-xl font-orbitron font-bold text-accent">
                    {result.userReward.toFixed(6)} ETH
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {result.hasClaimed 
                      ? "You have already claimed your reward." 
                      : "Congratulations! You won this round."}
                  </p>
                </div>
                {!result.hasClaimed && (
                  <Button
                    onClick={handleClaimReward}
                    disabled={claiming || !isConnected}
                    className="w-full bg-gradient-to-r from-accent via-primary to-secondary font-orbitron font-bold neon-glow-strong"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 mr-2" />
                        Claim Reward
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {!result.userWon && address && (
              <div className="bg-card border border-border/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground font-orbitron text-center">
                  You did not participate in this round or did not win.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleCloseButton}
                className="flex-1 bg-gradient-to-r from-primary via-secondary to-accent font-orbitron font-bold neon-glow-strong"
              >
                Close
              </Button>
              <Button
                onClick={handleCloseButton}
                variant="outline"
                className="px-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                title="Close dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RoundResultDialog;

