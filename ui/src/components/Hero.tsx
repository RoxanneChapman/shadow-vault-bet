import { Lock, Eye, Shield } from "lucide-react";
import { useState } from "react";

const Hero = () => {
  const scrollToRounds = () => {
    const roundsSection = document.getElementById('rounds-section');
    if (roundsSection) {
      roundsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-primary/30 mb-6 neon-glow">
            <Lock className="w-4 h-4 text-primary animate-pulse-glow" />
            <span className="text-sm font-orbitron">Fully Encrypted Betting</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-orbitron font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Bet Anonymously
            </span>
            <br />
            <span className="text-foreground">With FHE Encryption</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Create and participate in YES/NO betting rounds with complete privacy. Your bets remain encrypted until round resolution.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button 
              onClick={scrollToRounds}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground font-orbitron font-bold text-lg hover:opacity-90 transition-all neon-glow-strong"
            >
              View Rounds
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            {[
              {
                icon: Lock,
                title: "End-to-End Encryption",
                description: "Your bet amounts and choices are cryptographically secured until reveal time",
              },
              {
                icon: Eye,
                title: "Anonymous Participation",
                description: "Your betting choices remain hidden until round resolution",
              },
              {
                icon: Shield,
                title: "Trustless Protocol",
                description: "Smart contracts ensure fair and transparent resolution",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-card rounded-xl border border-border/50 p-6 hover:border-primary/50 transition-all neon-glow group"
              >
                <feature.icon className="w-12 h-12 text-primary mb-4 mx-auto group-hover:animate-pulse-glow" />
                <h3 className="text-lg font-orbitron font-bold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;


