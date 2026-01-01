# Reddit Clone

A modern Reddit-inspired social media platform built with React and Koa.

## Features

- User authentication with Firebase
- Post creation and management
- Commenting system with nested replies
- Upvote/downvote functionality
- Real-time messaging via WebSocket
- File attachments with Appwrite storage
- CAPTCHA verification for spam prevention
- Notification system
- Subreddit-style communities

## Tech Stack

### Frontend
- React 19
- Vite
- React Router
- Zustand for state management
- TipTap for rich text editing
- Lucide React for icons
- React Markdown for post rendering

### Backend
- Koa.js web framework
- Firebase for authentication
- Appwrite for file storage
- WebSocket for real-time features
- Cohere AI integration

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Appwrite account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Kelvintriet/Reddit.git
cd Reddit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory based on `.env.example`

4. Configure Firebase:
Update the Firebase configuration in your project with your credentials

5. Configure Appwrite:
Set up your Appwrite project and update the configuration

### Development

Run the development servers:

```bash
# Start frontend development server
npm run dev

# Start backend server (in another terminal)
npm run dev:server
```

The frontend will be available at `http://localhost:5173`
The backend will be available at `http://localhost:5000`

### Building for Production

```bash
npm run build
```

This will compile TypeScript and build the Vite project.

### Preview Production Build

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start Vite development server
- `npm run dev:server` - Start backend server with nodemon
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run start:client` - Start production client
- `npm run start:server` - Start production server
- `npm run cleanup` - Run file cleanup script

## Project Structure

```
Reddit/
├── public/           # Static assets
├── server/           # Backend code
│   ├── middleware/   # Authentication, CAPTCHA, etc.
│   ├── routes/       # API endpoints
│   ├── scripts/      # Utility scripts
│   ├── utils/        # Helper functions
│   └── websocket/    # WebSocket handlers
├── src/              # Frontend source code
├── firebase.json     # Firebase configuration
├── vercel.json       # Vercel deployment config
└── package.json      # Project dependencies
```

## Features in Detail

### Authentication
- Email/password authentication
- Social login support
- User session management
- Protected routes

### Posts
- Create posts with rich text
- Image attachments
- Link previews
- Upvote/downvote system
- Post sorting (hot, new, top)

### Comments
- Nested comment threads
- Markdown support
- Comment voting
- Reply functionality

### Real-time Features
- Live notifications
- WebSocket messaging
- File cleanup notifications

### Moderation
- Blocked user management
- CAPTCHA verification
- Spam prevention

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Contact

Project Link: https://github.com/Kelvintriet/Reddit
