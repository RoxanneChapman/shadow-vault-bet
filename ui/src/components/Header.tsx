import { ConnectButton } from "@rainbow-me/rainbowkit";

const Header = () => {
  return (
    <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-orbitron font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Encrypted Bet
            </h1>
          </div>
          
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground font-orbitron font-bold hover:opacity-90 transition-all neon-glow-strong"
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-destructive text-destructive-foreground font-orbitron font-bold"
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openChainModal}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-primary/30 hover:border-primary/60 transition-all font-orbitron"
                        >
                          {chain.hasIcon && (
                            <div className="w-4 h-4">
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  className="w-4 h-4"
                                />
                              )}
                            </div>
                          )}
                          {chain.name}
                        </button>

                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-card border border-primary/30 hover:border-primary/60 transition-all neon-glow font-orbitron"
                        >
                          {account.displayName}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
        
        <p className="text-center mt-4 text-lg font-orbitron text-muted-foreground">
          Bet Privately. <span className="text-primary">Reveal Honestly.</span>
        </p>
      </div>
    </header>
  );
};

export default Header;


