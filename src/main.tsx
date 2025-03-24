// Learn more at developers.reddit.com/docs
import { Devvit, useState } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
});

// Remove the custom hook that uses useEffect

// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: 'Add my post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    ui.showToast("Submitting your post - upon completion you'll navigate there.");

    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'My devvit post',
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading ...</text>
        </vstack>
      ),
    });
    ui.navigateTo(post);
  },
});

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Memory Matching Game',
  height: 'tall',
  render: (context) => {
    // Emojis for the cards
    const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];
    const allEmojis = [...emojis, ...emojis]; // Duplicate to create pairs

    // Game state
    const [cards, setCards] = useState<string[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'notStarted' | 'playing' | 'completed'>('notStarted');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const [leaderboard, setLeaderboard] = useState<{name: string, time: number}[]>([]);
    const [playerName, setPlayerName] = useState<string>('');
    const [isProcessingPair, setIsProcessingPair] = useState(false); // New state to track if we're processing a pair
    const [currentTimeout, setCurrentTimeout] = useState<number | null>(null);
    const [showLeaderboardAfterSave, setShowLeaderboardAfterSave] = useState<boolean>(false);
    
    // Debug state changes - using a setter function instead of useEffect
    const setGameStateWithLogging = (newState: 'notStarted' | 'playing' | 'completed') => {
      console.log(`Game state changed to: ${newState}`);
      setGameState(newState);
    };
    
    // Shuffle the cards
    const shuffleCards = () => {
      const shuffled = [...allEmojis].sort(() => Math.random() - 0.5);
      setCards(shuffled);
    };
    
    // Calculate current elapsed time without using timers
    const updateElapsedTime = () => {
      if (startTime && gameState === 'playing') {
        setElapsedTime(Date.now() - startTime);
      }
    };
    
    // Start a new game
    const startGame = () => {
      console.log("startGame function called");
      
      // Cancel any ongoing timers
      cancelCurrentTimeout();
      
      // Make sure we initialize the cards array with shuffled emojis
      const shuffled = [...allEmojis].sort(() => Math.random() - 0.5);
      
      setGameStateWithLogging('playing');
      setCards(shuffled);
      setFlippedIndices([]);
      setMatchedPairs([]);
      
      const now = Date.now();
      setStartTime(now);
      setEndTime(null);
      setElapsedTime(0);
      
      console.log("Game should be starting with", shuffled.length, "cards");
    };

    // Cancel any ongoing timeout
    const cancelCurrentTimeout = () => {
      if (currentTimeout !== null) {
        try {
          clearTimeout(currentTimeout);
          setCurrentTimeout(null);
        } catch (e) {
          console.log("Error clearing timeout:", e);
        }
      }
    };
    
    // Handle card clicks
    const handleCardClick = (index: number) => {
      // Update the elapsed time when a card is clicked
      updateElapsedTime();
      
      // If the card is already flipped or matched, don't do anything
      if (
        gameState !== 'playing' || 
        flippedIndices.includes(index) || 
        matchedPairs.includes(index)
      ) {
        return;
      }
      
      // If we're currently showing a non-matching pair and user clicks a new card
      if (isProcessingPair) {
        // Cancel the current timeout
        cancelCurrentTimeout();
        
        // Reset the processing state
        setIsProcessingPair(false);
        
        // Clear the current flipped cards and show the new one
        setFlippedIndices([index]);
        return;
      }
      
      // If we already have 2 cards flipped, don't allow more
      if (flippedIndices.length >= 2) {
        return;
      }
      
      const newFlippedIndices = [...flippedIndices, index];
      setFlippedIndices(newFlippedIndices);
      
      // Check for a match when two cards are flipped
      if (newFlippedIndices.length === 2) {
        const [firstIndex, secondIndex] = newFlippedIndices;
        
        if (cards[firstIndex] === cards[secondIndex]) {
          // Match found
          const newMatchedPairs = [...matchedPairs, firstIndex, secondIndex];
          setMatchedPairs(newMatchedPairs);
          setFlippedIndices([]);
          
          // Check if game is completed
          if (newMatchedPairs.length === cards.length) {
            const now = Date.now();
            setEndTime(now);
            setGameStateWithLogging('completed');
          }
        } else {
          // No match, set the processing flag so the user can see both cards
          setIsProcessingPair(true);
          
          // Manual timeout approach since setTimeout may not be reliable
          const currentTime = Date.now();
          
          // Check every 100ms using normal game loop 
          const checkTimeElapsed = () => {
            const now = Date.now();
            if (now - currentTime >= 1000) {
              // If enough time has passed, flip the cards back
              setFlippedIndices([]);
              setIsProcessingPair(false);
              setCurrentTimeout(null);
              updateElapsedTime();
            } else {
              // Keep showing the cards
              const timeoutId = setTimeout(checkTimeElapsed, 100);
              setCurrentTimeout(timeoutId as unknown as number);
            }
          };
          
          // Start the delayed flip
          try {
            const timeoutId = setTimeout(checkTimeElapsed, 1000);
            setCurrentTimeout(timeoutId as unknown as number);
          } catch (e) {
            console.log("setTimeout not available, using fallback");
            // Fallback for environments where setTimeout isn't available
            setFlippedIndices(newFlippedIndices);
          }
        }
      }
    };
    
    // Save score to leaderboard
    const saveScore = () => {
      if (playerName && endTime && startTime) {
        const time = endTime - startTime;
        const newLeaderboard = [...leaderboard, { name: playerName, time }]
          .sort((a, b) => a.time - b.time)
          .slice(0, 10); // Keep only top 10
        
        setLeaderboard(newLeaderboard);
        setPlayerName('');
        setShowLeaderboardAfterSave(true);
        
        // Show toast confirmation
        try {
          context.ui.showToast("Score saved to leaderboard!");
        } catch (e) {
          console.log("Unable to show toast");
        }
      }
    };
    
    // Format time as mm:ss.ms
    const formatTime = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const milliseconds = Math.floor((ms % 1000) / 10);
      
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    };

    // Close non-matching cards
    const closeNonMatchingCards = () => {
      setFlippedIndices([]);
      setIsProcessingPair(false);
      updateElapsedTime();
    };

    // Reset game to start screen
    const resetToStartScreen = () => {
      setGameStateWithLogging('notStarted');
    };

    // Update elapsed time before rendering
    if (gameState === 'playing' && startTime) {
      updateElapsedTime();
    }

    if (gameState === 'notStarted') {
      return (
        <vstack height="100%" width="100%" gap="medium" alignment="center middle">
          <text size="xxlarge" weight="bold">Memory Matching Game</text>
          <text size="large">Find all matching emoji pairs as quickly as you can!</text>
          <button appearance="primary" onPress={() => {
            console.log("Start Game button pressed");
            startGame();
          }}>Start Game</button>
          
          {leaderboard.length > 0 && (
            <vstack gap="small" width="80%">
              <text size="large" weight="bold">Leaderboard</text>
              <hstack>
                <text width="50%" weight="bold">Name</text>
                <text width="50%" weight="bold">Time</text>
              </hstack>
              {leaderboard.map((entry, i) => (
                <hstack key={i.toString()}>
                  <text width="50%">{entry.name}</text>
                  <text width="50%">{formatTime(entry.time)}</text>
                </hstack>
              ))}
            </vstack>
          )}
        </vstack>
      );
    }
    
    // Add a debug check to ensure we have cards to render
    if (cards.length === 0) {
      console.log("No cards available to render game");
      return (
        <vstack height="100%" width="100%" gap="medium" alignment="center middle">
          <text size="large">Loading game...</text>
          <button appearance="primary" onPress={shuffleCards}>Initialize Cards</button>
        </vstack>
      );
    }

    return (
      <vstack height="100%" width="100%" gap="medium" padding="medium">
        <hstack gap="medium" alignment="center middle">
          <text size="large" weight="bold">Time: {formatTime(elapsedTime)}</text>
          <button appearance="secondary" onPress={startGame}>Restart</button>
          <button appearance="secondary" onPress={updateElapsedTime}>Update Timer</button>
        </hstack>
        
        <vstack gap="small">
          {[0, 1, 2, 3].map(row => (
            <hstack key={row.toString()} gap="small" alignment="center middle">
              {[0, 1, 2, 3, 4, 5].map(col => {
                const index = row * 6 + col;
                const isFlipped = flippedIndices.includes(index) || matchedPairs.includes(index);
                const isProcessing = flippedIndices.includes(index) && isProcessingPair;
                
                return (
                  <hstack 
                    key={col.toString()} 
                    height="60px" 
                    width="60px" 
                    backgroundColor={
                      matchedPairs.includes(index) ? "#e0ffe0" : 
                      isProcessing ? "#fff8e0" : "#f0f0f0"
                    } 
                    cornerRadius="medium"
                    border="thin"
                    borderColor={flippedIndices.includes(index) ? "blue" : "gray"}
                    onPress={() => handleCardClick(index)}
                    alignment="center middle"
                  >
                    <text size="xxlarge">{isFlipped ? cards[index] : "?"}</text>
                  </hstack>
                );
              })}
            </hstack>
          ))}
        </vstack>
        
        {gameState === 'completed' && !showLeaderboardAfterSave && (
          <vstack gap="medium" padding="medium" backgroundColor="#f5f5f5" cornerRadius="medium">
            <text size="xlarge" weight="bold">Game Completed!</text>
            <text size="large">Your time: {formatTime(endTime! - startTime!)}</text>
            
            <vstack gap="small">
              <hstack gap="small" alignment="center">
                <text>Save score as:</text>
                <textfield 
                  value={playerName} 
                  onValueChange={setPlayerName}
                  placeholder="Enter your name" 
                  width="60%"
                />
              </hstack>
              <button appearance="primary" onPress={saveScore}>Save Score</button>
            </vstack>
            
            <button appearance="secondary" onPress={resetToStartScreen}>Return to Start</button>
          </vstack>
        )}
        
        {gameState === 'completed' && showLeaderboardAfterSave && (
          <vstack gap="medium" padding="medium" backgroundColor="#f5f5f5" cornerRadius="medium" width="100%">
            <text size="xlarge" weight="bold">Leaderboard</text>
            
            <vstack gap="small" width="100%">
              <hstack>
                <text width="10%" weight="bold">Rank</text>
                <text width="50%" weight="bold">Name</text>
                <text width="40%" weight="bold">Time</text>
              </hstack>
              
              {leaderboard.map((entry, i) => (
                <hstack key={i.toString()} 
                  backgroundColor={i === leaderboard.findIndex(e => e.time === entry.time && e.name === entry.name) ? "#e0f7ff" : undefined}
                  padding="xsmall"
                  cornerRadius="small">
                  <text width="10%">{i + 1}</text>
                  <text width="50%">{entry.name}</text>
                  <text width="40%">{formatTime(entry.time)}</text>
                </hstack>
              ))}
            </vstack>
            
            <hstack gap="small">
              <button appearance="primary" onPress={startGame}>Play Again</button>
              <button appearance="secondary" onPress={resetToStartScreen}>Return to Start</button>
            </hstack>
          </vstack>
        )}
      </vstack>
    );
  },
});

export default Devvit;
