// Learn more at developers.reddit.com/docs
import { Devvit, useState, KVStore } from '@devvit/public-api';


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
      title: 'Emoji Pair',
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
  name: 'Emoji Pair',
  height: 'tall',
  render: (context) => {
    // Emojis for the cards
    const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🥔', '🐯', '🦁', '🐮'];
    const allEmojis = [...emojis, ...emojis]; // Duplicate to create pairs

    // Game state
    const [cards, setCards] = useState<string[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'notStarted' | 'playing' | 'completed'>('notStarted');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    
    // Initialize KVStore for persistent leaderboard
    const leaderboardStore = context.kvStore;
    const [leaderboard, setLeaderboard] = useState<{name: string, time: number}[]>([]);
    const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
    
    // Remove hasNonMatchingCards and just keep track of whether we have non-matching pair
    const [showLeaderboardAfterSave, setShowLeaderboardAfterSave] = useState<boolean>(false);
    
    // Load leaderboard from KVStore only once
    if (!leaderboardLoaded) {
      setLeaderboardLoaded(true);
      leaderboardStore.get<{name: string, time: number}[]>('leaderboard')
        .then(savedLeaderboard => {
          if (savedLeaderboard) {
            setLeaderboard(savedLeaderboard);
          }
        })
        .catch(e => {
          console.log("Error loading leaderboard:", e);
        });
    }
    
    // Replace playerName state with username from Reddit
    const [username] = useState(async () => {
      const currUser = await context.reddit.getCurrentUser();
      return currUser?.username ?? 'anon';
    });
    
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
    
    // Reset game to start screen
    const resetToStartScreen = () => {
      setGameStateWithLogging('notStarted');
    };
    
    // Optimized card click handler - modified to handle clicking a new card when showing non-matching pair
    const handleCardClick = (index: number) => {
      // If the card is already flipped or matched, or game is not playing, don't do anything
      if (
        gameState !== 'playing' || 
        flippedIndices.includes(index) || 
        matchedPairs.includes(index)
      ) {
        return;
      }
      
      // Update elapsed time only on card clicks instead of every render
      if (startTime) {
        setElapsedTime(Date.now() - startTime);
      }
      
      // If we have 2 flipped cards already (non-matching), close them and flip the new card
      if (flippedIndices.length === 2) {
        setFlippedIndices([index]);
        return;
      }
      
      // Flip the card
      const newFlippedIndices = [...flippedIndices, index];
      setFlippedIndices(newFlippedIndices);
      
      // Check for a match when two cards are flipped
      if (newFlippedIndices.length === 2) {
        const [firstIndex, secondIndex] = newFlippedIndices;
        
        if (cards[firstIndex] === cards[secondIndex]) {
          // Match found - update matched pairs
          const newMatchedPairs = [...matchedPairs, firstIndex, secondIndex];
          setMatchedPairs(newMatchedPairs);
          setFlippedIndices([]);
          
          // Check if game is completed
          if (newMatchedPairs.length === cards.length) {
            const now = Date.now();
            setEndTime(now);
            setElapsedTime(now - startTime!);
            setGameStateWithLogging('completed');
          }
        }
        // No match case is now handled by clicking a different card
      }
    };
    
    // Save score to leaderboard and persist to KVStore
    const saveScore = async () => {
      if (username && endTime && startTime) {
        const time = endTime - startTime;
        const newLeaderboard = [...leaderboard, { name: username, time }]
          .sort((a, b) => a.time - b.time)
          .slice(0, 10); // Keep only top 10
        
        // Update local state
        setLeaderboard(newLeaderboard);
        
        // Persist to KVStore
        try {
          await leaderboardStore.put('leaderboard', newLeaderboard);
          setShowLeaderboardAfterSave(true);
          
          // Show toast confirmation
          try {
            context.ui.showToast("Score saved to leaderboard!");
          } catch (e) {
            console.log("Unable to show toast");
          }
        } catch (e) {
          console.log("Error saving leaderboard:", e);
          context.ui.showToast("Failed to save score to leaderboard");
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

    // title screen
    if (gameState === 'notStarted') {
      return (
        <zstack height="100%" width="100%">
          <image
            url="tile_background.png"
            description="tile_background"
            imageHeight={256}
            imageWidth={256}
            height="1080px"
            width="1920px"
          />
          <vstack 
            height="100%" 
            width="100%" 
            gap="medium" 
            alignment="center middle"
            backgroundColor="rgba(255, 255, 255, 0.7)" // Semi-transparent white background for text readability
          >
            <text size="xxlarge" weight="bold">Emoji Pair</text>
            <text size="medium">Find all matching emoji pairs as quickly as you can!</text>
            <text size="xsmall">tanczacy_ziemniak 2025</text>
            <button appearance="primary" onPress={() => {
              console.log("Start Game button pressed");
              startGame();
            }}>Start Game</button>
          </vstack>
        </zstack>
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

    // game play screen
    if (gameState === 'playing') {
      return (
        <vstack height="100%" width="100%" gap="medium" padding="medium">
          <hstack gap="medium" alignment="center middle">
            <text size="large" weight="bold">🕓 {formatTime(elapsedTime)}</text>
            <button appearance="secondary" onPress={startGame}>🔁</button>
            <button appearance="secondary" onPress={resetToStartScreen}>🏠︎</button>
          </hstack>
          
          <vstack gap="small">
            {[0, 1, 2, 3, 4, 5].map(row => (
              <hstack key={row.toString()} gap="small" alignment="center middle">
                {[0, 1, 2, 3].map(col => {
                  const index = row * 4 + col;
                  const isFlipped = flippedIndices.includes(index) || matchedPairs.includes(index);
                  
                  return (
                    <hstack 
                      key={col.toString()} 
                      height="60px" 
                      width="60px" 
                      backgroundColor={
                        matchedPairs.includes(index) ? "#e0ffe0" : 
                        flippedIndices.includes(index) ? "#fff8e0" : "#f0f0f0"
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
          
          
        </vstack>
      );
    }
    
    // game completed screen
    if (gameState === 'completed') {
      if (!showLeaderboardAfterSave) {
        return (
          <vstack height="100%" width="100%" gap="medium" padding="medium" alignment="center middle">
            <vstack gap="medium" padding="medium" backgroundColor="#f5f5f5" cornerRadius="medium">
              <hstack gap="small" alignment="center">
                <text size="xlarge" weight="bold">🎉</text>
              </hstack>
              <hstack gap="small" alignment="center">
                <text size="large">🕓 {formatTime(endTime! - startTime!)}</text>
              </hstack>
              
              

              <hstack gap="small" alignment="center">
              <button appearance="primary" onPress={saveScore}>Save Your Record</button>
                <button appearance="secondary" onPress={resetToStartScreen}>🏠︎</button>
              </hstack>
              
              
            </vstack>
          </vstack>
        );
      } else {
        return (
          <vstack height="100%" width="100%" gap="medium" padding="medium" alignment="center middle">
            <vstack gap="medium" padding="medium" backgroundColor="#f5f5f5" cornerRadius="medium" width="100%">
              <text size="xlarge" weight="bold">Leaderboard</text>
              
              <vstack gap="small" width="100%">
                <hstack>
                  <text width="10%" weight="bold">🏆</text>
                  <text width="50%" weight="bold">🥔</text>
                  <text width="40%" weight="bold">🕓</text>
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
                <button appearance="secondary" onPress={startGame}>🔁</button>
                <button appearance="secondary" onPress={resetToStartScreen}>🏠︎</button>
              </hstack>
            </vstack>
          </vstack>
        );
      }
    }
    
    // Default fallback UI in case no condition matches
    return (
      <vstack height="100%" width="100%" alignment="middle center">
        <text>Loading game...</text>
        <button appearance="primary" onPress={resetToStartScreen}>🏠︎</button>
      </vstack>
    );
  },
});

export default Devvit;
