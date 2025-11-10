import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import BetRoundCard from "@/components/BetRoundCard";
import CreateRoundDialog from "@/components/CreateRoundDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useEncryptedBet } from "@/hooks/useEncryptedBet";
import { usePublicClient, useChainId } from "wagmi";
import { getContractAddress, CONTRACT_ABI } from "@/config/contracts";

const Home = () => {
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { getRoundCount, getRoundInfo } = useEncryptedBet();
  const client = usePublicClient();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);

  const loadRounds = async () => {
    try {
      setLoading(true);
      const count = await getRoundCount();
      const roundPromises = [];

      for (let i = 0; i < count; i++) {
        roundPromises.push(
          client?.readContract({
            address: contractAddress,
            abi: CONTRACT_ABI,
            functionName: "getRoundInfo",
            args: [BigInt(i)],
          })
        );
      }

      const roundInfos = await Promise.all(roundPromises);
      
      console.log('Loaded round infos:', roundInfos);
      
      const processedRounds = roundInfos
        .map((info: any, index: number) => {
          try {
            // viem may return tuple as array or object depending on ABI
            let id, creator, name, endTime, resolved, participantCount;
            
            if (Array.isArray(info)) {
              // If returned as array: [id, creator, name, endTime, resolved, participantCount]
              [id, creator, name, endTime, resolved, participantCount] = info;
            } else if (info && typeof info === 'object') {
              // If returned as object with named properties
              id = info.id ?? info[0];
              creator = info.creator ?? info[1];
              name = info.name ?? info[2];
              endTime = info.endTime ?? info[3];
              resolved = info.resolved ?? info[4];
              participantCount = info.participantCount ?? info[5];
            } else {
              // Skip invalid data
              console.warn(`Invalid round info at index ${index}:`, info);
              return null;
            }
            
            // Filter out empty rounds (check if name exists and is not empty)
            if (!name || name === '') {
              console.warn(`Round at index ${index} has no name`);
              return null;
            }
            
            const round = {
              roundId: typeof id === 'bigint' ? Number(id) : (Number(id) || index),
              name: String(name || `Round #${index}`),
              endTime: typeof endTime === 'bigint' ? endTime : BigInt(endTime || 0),
              participantCount: typeof participantCount === 'bigint' ? participantCount : BigInt(participantCount || 0),
              resolved: Boolean(resolved),
              creator: creator,
              encrypted: true, // All bets are encrypted
            };
            
            console.log(`Processed round ${index}:`, round);
            return round;
          } catch (error) {
            console.error(`Error processing round at index ${index}:`, error, info);
            return null;
          }
        })
        .filter((round: any) => round !== null); // Remove null entries
      
      console.log('Processed rounds:', processedRounds);
      setRounds(processedRounds);
    } catch (error) {
      console.error("Failed to load rounds:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRounds();
    // Auto-refresh disabled - user must manually refresh or trigger via actions
  }, [client, chainId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <Hero />
        
        {/* Rules and Winning Logic Section */}
        <section className="py-12 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-orbitron font-bold text-center mb-8">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  How It Works
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h3 className="text-xl font-orbitron font-bold mb-4 text-primary">
                    Participation Rules
                  </h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Connect your wallet to participate in betting rounds</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Place bets by choosing YES or NO and entering your bet amount in ETH</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Your bet amount and choice are encrypted using Fully Homomorphic Encryption (FHE)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>You can place multiple bets on the same round</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Bets are locked once the round end time is reached</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h3 className="text-xl font-orbitron font-bold mb-4 text-secondary">
                    Winning Logic
                  </h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>After a round ends, click "Decrypt & Resolve" to reveal results</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>The side (YES or NO) with the higher total bet amount wins</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>If both sides have equal amounts, it's a tie (no winner)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Winners receive a proportional share of the total pool based on their bet amount</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Reward = (Your Bet Amount / Winning Side Total) × Total Pool</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Click "Claim Reward" to receive your winnings after a round is resolved</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-xl border border-primary/20 p-6">
                <h3 className="text-lg font-orbitron font-bold mb-3 text-center">
                  Example
                </h3>
                <p className="text-muted-foreground text-center">
                  If YES side has 2.0 ETH and NO side has 1.5 ETH, YES wins. 
                  If you bet 0.5 ETH on YES, your reward = (0.5 / 2.0) × 3.5 ETH = 0.875 ETH
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <section id="rounds-section" className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-orbitron font-bold">
                Active <span className="text-primary">Betting Rounds</span>
              </h2>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-primary via-secondary to-accent font-orbitron font-bold neon-glow-strong"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Round
              </Button>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-orbitron">Loading rounds...</p>
              </div>
            ) : rounds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-orbitron mb-4">No betting rounds yet</p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-primary via-secondary to-accent font-orbitron font-bold neon-glow-strong"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Round
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rounds.map((round) => (
                  <BetRoundCard key={round.roundId} {...round} onRefresh={loadRounds} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />

      <CreateRoundDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadRounds}
      />
    </div>
  );
};

export default Home;


