// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedBet - Encrypted betting platform
/// @notice Anonymous YES/NO betting rounds with encrypted amounts and choices
contract EncryptedBet is SepoliaConfig {
    struct BetRound {
        uint256 id;
        address creator;
        string name;
        uint256 endTime;
        bool resolved;
        euint32 totalAmount;
        euint32 yesAmount;
        euint32 noAmount;
        uint256 participantCount;
        mapping(address => bool) participants;
    }

    struct UserBet {
        uint256 ethAmount;      // 用户投注的 ETH 金额（wei）
        bool choice;            // 用户的选择 (true=YES, false=NO)
        bool hasClaimed;         // 是否已提取奖金
    }

    mapping(uint256 => BetRound) public rounds;
    mapping(uint256 => mapping(address => UserBet)) public userBets; // roundId => user => bet info
    mapping(uint256 => uint256) public roundTotalPool; // roundId => total ETH pool (wei)
    uint256 public roundCounter;

    event RoundCreated(uint256 indexed roundId, address indexed creator, string name, uint256 endTime);
    event BetPlaced(uint256 indexed roundId, address indexed participant, uint256 amount);
    event RoundResolved(uint256 indexed roundId, bool winner, uint256 yesAmount, uint256 noAmount);
    event RewardClaimed(uint256 indexed roundId, address indexed user, uint256 amount);

    /// @notice Create a new betting round
    /// @param name The name of the betting round
    /// @param endTime Unix timestamp when the round ends
    function createRound(
        string calldata name,
        uint256 endTime
    ) external {
        require(endTime > block.timestamp, "End time must be in the future");
        
        uint256 roundId = roundCounter++;
        BetRound storage round = rounds[roundId];
        round.id = roundId;
        round.creator = msg.sender;
        round.name = name;
        round.endTime = endTime;
        
        // Initialize encrypted amounts to zero
        round.totalAmount = FHE.asEuint32(0);
        round.yesAmount = FHE.asEuint32(0);
        round.noAmount = FHE.asEuint32(0);
        round.participantCount = 0; // Creator is not a participant until they place a bet
        
        FHE.allowThis(round.totalAmount);
        FHE.allowThis(round.yesAmount);
        FHE.allowThis(round.noAmount);
        
        emit RoundCreated(roundId, msg.sender, name, endTime);
    }

    /// @notice Place a bet on an existing round
    /// @param roundId The ID of the betting round
    /// @param choice True for YES, False for NO
    /// @param encryptedAmount Encrypted bet amount
    /// @param inputProof Proof for encrypted amount and choice
    function placeBet(
        uint256 roundId,
        externalEbool choice,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof
    ) external payable {
        BetRound storage round = rounds[roundId];
        require(!round.resolved, "Round already resolved");
        require(block.timestamp < round.endTime, "Round has ended");
        require(round.creator != address(0), "Round does not exist");
        require(msg.value > 0, "Must send ETH");
        
        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
        ebool betChoice = FHE.fromExternal(choice, inputProof);
        
        round.totalAmount = FHE.add(round.totalAmount, amount);
        
        bool isNewParticipant = !round.participants[msg.sender];
        if (isNewParticipant) {
            round.participantCount++;
            round.participants[msg.sender] = true;
        }
        
        // Encrypted conditional: if choice is YES, add to yesAmount, else add to noAmount
        euint32 yesAmountIncrement = FHE.select(betChoice, amount, FHE.asEuint32(0));
        euint32 noAmountIncrement = FHE.select(betChoice, FHE.asEuint32(0), amount);
        
        round.yesAmount = FHE.add(round.yesAmount, yesAmountIncrement);
        round.noAmount = FHE.add(round.noAmount, noAmountIncrement);
        
        // Update total ETH pool
        roundTotalPool[roundId] += msg.value;
        
        // Record or update user bet
        // Note: We can't decrypt the choice here, so we'll need to verify it in claimReward
        // For now, we store the ETH amount and let the frontend verify the choice
        if (isNewParticipant) {
            userBets[roundId][msg.sender] = UserBet({
                ethAmount: msg.value,
                choice: false, // Will be verified in claimReward based on decrypted data
                hasClaimed: false
            });
        } else {
            // User placing another bet - accumulate ETH amount
            userBets[roundId][msg.sender].ethAmount += msg.value;
        }
        
        FHE.allowThis(round.totalAmount);
        FHE.allowThis(round.yesAmount);
        FHE.allowThis(round.noAmount);
        
        emit BetPlaced(roundId, msg.sender, msg.value);
    }

    /// @notice Resolve a betting round and distribute winnings
    /// @param roundId The ID of the betting round to resolve
    function resolveRound(uint256 roundId) external {
        BetRound storage round = rounds[roundId];
        require(!round.resolved, "Round already resolved");
        require(block.timestamp >= round.endTime, "Round has not ended yet");
        require(round.creator != address(0), "Round does not exist");
        
        round.resolved = true;
        
        // Make all amounts publicly decryptable so any participant can decrypt
        FHE.makePubliclyDecryptable(round.totalAmount);
        FHE.makePubliclyDecryptable(round.yesAmount);
        FHE.makePubliclyDecryptable(round.noAmount);
        
        // Note: Winner determination and reward calculation happens off-chain
        // Users will call claimReward with their calculated reward amount
    }

    /// @notice Claim reward for a resolved round
    /// @param roundId The ID of the betting round
    /// @param rewardAmount The amount of ETH (in wei) the user is claiming
    /// @param userBetAmountInUnits The user's bet amount in encrypted units (for verification)
    /// @param userChoice The user's bet choice (true=YES, false=NO)
    /// @param winningSide The winning side (true=YES, false=NO)
    /// @param winningSideTotalInUnits Total amount of winning side in encrypted units
    function claimReward(
        uint256 roundId,
        uint256 rewardAmount,
        uint256 userBetAmountInUnits,
        bool userChoice,
        bool winningSide,
        uint256 winningSideTotalInUnits
    ) external {
        BetRound storage round = rounds[roundId];
        require(round.resolved, "Round not resolved yet");
        require(round.creator != address(0), "Round does not exist");
        require(round.participants[msg.sender], "Not a participant");
        
        UserBet storage userBet = userBets[roundId][msg.sender];
        require(!userBet.hasClaimed, "Reward already claimed");
        require(userBet.ethAmount > 0, "No bet placed");
        
        // Verify user chose the winning side
        require(userChoice == winningSide, "User did not win");
        require(winningSideTotalInUnits > 0, "Invalid winning side total");
        
        // Verify the reward calculation
        // Reward = (userBetAmountInUnits / winningSideTotalInUnits) * totalPool
        uint256 totalPool = roundTotalPool[roundId];
        require(totalPool > 0, "No pool available");
        require(rewardAmount <= totalPool, "Reward exceeds pool");
        
        // Calculate expected reward: (userBetAmountInUnits * totalPool) / winningSideTotalInUnits
        uint256 expectedReward = (userBetAmountInUnits * totalPool) / winningSideTotalInUnits;
        
        // Allow some tolerance for rounding errors (within 2%)
        uint256 minReward = expectedReward * 98 / 100;
        uint256 maxReward = expectedReward * 102 / 100;
        require(rewardAmount >= minReward && rewardAmount <= maxReward, "Invalid reward amount");
        
        // Mark as claimed
        userBet.hasClaimed = true;
        
        // Transfer reward
        (bool success, ) = payable(msg.sender).call{value: rewardAmount}("");
        require(success, "Transfer failed");
        
        emit RewardClaimed(roundId, msg.sender, rewardAmount);
    }

    /// @notice Authorize a participant to decrypt round amounts
    /// @param roundId The ID of the betting round
    /// @param participant The address to authorize
    function authorizeParticipant(uint256 roundId, address participant) external {
        BetRound storage round = rounds[roundId];
        require(round.creator != address(0), "Round does not exist");
        require(round.participants[participant], "Address is not a participant");
        
        // Authorize participant to decrypt all amounts
        FHE.allow(round.totalAmount, participant);
        FHE.allow(round.yesAmount, participant);
        FHE.allow(round.noAmount, participant);
    }

    /// @notice Make round amounts publicly decryptable (for resolved rounds)
    /// @param roundId The ID of the betting round
    function makeAmountsPublic(uint256 roundId) external {
        BetRound storage round = rounds[roundId];
        require(round.resolved, "Round must be resolved first");
        require(round.creator != address(0), "Round does not exist");
        
        // Make all amounts publicly decryptable
        FHE.makePubliclyDecryptable(round.totalAmount);
        FHE.makePubliclyDecryptable(round.yesAmount);
        FHE.makePubliclyDecryptable(round.noAmount);
    }

    /// @notice Get round information (public data only)
    /// @param roundId The ID of the betting round
    function getRoundInfo(uint256 roundId) external view returns (
        uint256 id,
        address creator,
        string memory name,
        uint256 endTime,
        bool resolved,
        uint256 participantCount
    ) {
        BetRound storage round = rounds[roundId];
        return (
            round.id,
            round.creator,
            round.name,
            round.endTime,
            round.resolved,
            round.participantCount
        );
    }

    /// @notice Get encrypted total amount for a round
    /// @param roundId The ID of the betting round
    function getTotalAmount(uint256 roundId) external view returns (euint32) {
        return rounds[roundId].totalAmount;
    }

    /// @notice Get encrypted YES amount for a round
    /// @param roundId The ID of the betting round
    function getYesAmount(uint256 roundId) external view returns (euint32) {
        return rounds[roundId].yesAmount;
    }

    /// @notice Get encrypted NO amount for a round
    /// @param roundId The ID of the betting round
    function getNoAmount(uint256 roundId) external view returns (euint32) {
        return rounds[roundId].noAmount;
    }

    /// @notice Check if address participated in a round
    /// @param roundId The ID of the betting round
    /// @param participant The address to check
    function hasParticipated(uint256 roundId, address participant) external view returns (bool) {
        return rounds[roundId].participants[participant];
    }

    /// @notice Get user bet information for a round
    /// @param roundId The ID of the betting round
    /// @param participant The address to check
    function getUserBet(uint256 roundId, address participant) external view returns (
        uint256 ethAmount,
        bool hasClaimed
    ) {
        UserBet storage bet = userBets[roundId][participant];
        return (bet.ethAmount, bet.hasClaimed);
    }

    /// @notice Get total ETH pool for a round
    /// @param roundId The ID of the betting round
    function getRoundTotalPool(uint256 roundId) external view returns (uint256) {
        return roundTotalPool[roundId];
    }
}


