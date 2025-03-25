# Emoji Pair Memory Game

A fun memory card game built for Reddit using Devvit, Reddit's app development platform.

![Emoji Pair Game](https://placehold.co/600x400?text=Emoji+Pair+Game)

## Description

Emoji Pair is a classic memory matching game where players need to find all matching emoji pairs as quickly as possible. The game features:

- 24 cards (12 pairs of emojis)
- Real-time timer
- Score tracking
- Global leaderboard
- Clean and intuitive UI

## How It Works

1. Moderators can add the "Emoji Pair" game to their subreddit via the subreddit menu
2. Users can play the game by trying to find all matching emoji pairs
3. After completing the game, players can save their scores to a global leaderboard
4. The leaderboard displays the top 10 fastest times

## Development

### Prerequisites

- Node.js (>=18.0.0)
- npm or yarn
- Devvit CLI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/emoji-pair.git
cd emoji-pair
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npx devvit dev
```

### Deploying to Reddit

1. Build the project:
```bash
npx devvit build
```

2. Deploy to Reddit:
```bash
npx devvit deploy
```

## Technology Stack

- [Devvit](https://developers.reddit.com/docs) - Reddit's app development platform
- TypeScript/TSX - For type-safe code and UI components
- KVStore - For persistent leaderboard data storage

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the BSD-3-Clause License - see the package.json file for details.

## Credits

- Created by tanczacy_ziemniak
- Built with Devvit
