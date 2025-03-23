// Learn more at developers.reddit.com/docs
import { Devvit, useState } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
});

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
    const [timerId, setTimerId] = useState<number | null>(null);
    
    // Shuffle the cards
    const shuffleCards = () => {
      const shuffled = [...allEmojis].sort(() => Math.random() - 0.5);
      setCards(shuffled);
    };
    
    // Start the timer
    const startTimer = () => {
      // Clear any existing timer
      if (timerId !== null) {
        clearInterval(timerId);
      }
      
      // Start a new timer that updates elapsed time every 100ms
      const id = setInterval(() => {
        if (startTime) {
          setElapsedTime(Date.now() - startTime);
        }
      }, 100);
      
      setTimerId(id as unknown as number);
    };
    
    // Stop the timer
    const stopTimer = () => {
      if (timerId !== null) {
        clearInterval(timerId);
        setTimerId(null);
      }
    };
    
    // Start a new game
    const startGame = () => {
      // Clear any existing timer
      stopTimer();
      
      shuffleCards();
      setFlippedIndices([]);
      setMatchedPairs([]);
      setGameState('playing');
      const now = Date.now();
      setStartTime(now);
      setEndTime(null);
      setElapsedTime(0);
      
      // Start the timer for the new game
      startTimer();
    };
    
    // Handle card clicks
    const handleCardClick = (index: number) => {
      if (
        gameState !== 'playing' || 
        flippedIndices.includes(index) || 
        matchedPairs.includes(index) ||
        flippedIndices.length >= 2
      ) {
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
            setGameState('completed');
            stopTimer(); // Stop the timer when game completes
          }
        } else {
          // No match, flip back after delay
          setTimeout(() => {
            setFlippedIndices([]);
          }, 1000);
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

    if (gameState === 'notStarted') {
      return (
        <vstack height="100%" width="100%" gap="medium" alignment="center middle">
          <text size="xxlarge" weight="bold">Memory Matching Game</text>
          <text size="large">Find all matching emoji pairs as quickly as you can!</text>
          <button appearance="primary" onPress={startGame}>Start Game</button>
          
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

    return (
      <vstack height="100%" width="100%" gap="medium" padding="medium">
        <hstack gap="medium" alignment="center middle">
          <text size="large" weight="bold">Time: {formatTime(elapsedTime)}</text>
          <button appearance="secondary" onPress={startGame}>Restart</button>
        </hstack>
        
        <vstack gap="small">
          {[0, 1, 2, 3].map(row => (
            <hstack key={row.toString()} gap="small" alignment="center middle">
              {[0, 1, 2, 3, 4, 5].map(col => {
                const index = row * 6 + col;
                const isFlipped = flippedIndices.includes(index) || matchedPairs.includes(index);
                return (
                  <hstack 
                    key={col.toString()} 
                    height="60px" 
                    width="60px" 
                    backgroundColor={matchedPairs.includes(index) ? "#e0ffe0" : "#f0f0f0"} 
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
        
        {gameState === 'completed' && (
          <vstack gap="medium" padding="medium" backgroundColor="#f5f5f5" cornerRadius="medium">
            <text size="xlarge" weight="bold">Game Completed!</text>
            <text size="large">Your time: {formatTime(endTime! - startTime!)}</text>
            
            <vstack gap="small">
              <text>Save score as: {playerName || "Anonymous"}</text>
              <button appearance="primary" onPress={saveScore}>Save Score</button>
            </vstack>
            
            <button appearance="secondary" onPress={startGame}>Play Again</button>
          </vstack>
        )}
      </vstack>
    );
  },
});

export default Devvit;
