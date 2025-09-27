# Grow with Freya 📚

A personalized storytelling app for children with voice cloning and AI-powered narration.

## Overview

Grow with Freya is a Co-Engagement App that creates personalized storytelling experiences for children. Parents can create profiles for their kids, record voice samples for personalized narration, and enjoy stories that feature their child's name and avatar.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open the app:
   - **iOS**: Press `i` to open in iOS Simulator
   - **Android**: Press `a` to open in Android Emulator
   - **Web**: Press `w` to open in web browser
   - **Physical Device**: Scan QR code with Expo Go app

## Project Structure

```
grow-with-freya/
├── app/                    # App screens (file-based routing)
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Stories screen
│   │   └── profiles.tsx   # Profiles screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
├── constants/             # App constants and themes
├── hooks/                 # Custom React hooks
└── assets/               # Images, fonts, and other assets
```

## Features (In Development)

- 👶 **Multi-Child Profiles** - Create and manage profiles for multiple children
- 🎨 **Avatar Creation** - Customize avatars for each child
- 🎤 **Voice Recording** - Record voice samples for personalized narration
- 📖 **Story Library** - Browse age-appropriate stories
- 🔊 **Audio Playback** - Listen to stories with personalized voices
- ⏰ **Screen Time Controls** - WHO/EU-aligned usage limits
- 🔒 **Privacy First** - GDPR compliant with strong security measures
- 🎮 **Sensory Games** - Support sensory development and exploration
- 😊 **Emotional Expression** - Support emotional development
- 👨‍👩‍👧‍👦 **Co-Engagement Tracking** - Parent-child interaction guidance
- 🌙 **Bedtime Stories** - Calming audio for sleep and relaxation

## Technology Stack

- **Framework**: Expo with React Native
- **Navigation**: Expo Router (file-based routing)
- **Language**: TypeScript
- **Styling**: React Native StyleSheet
- **State Management**: TBD (Zustand/Redux)
- **Audio**: TBD (expo-av)
- **Authentication**: TBD (Firebase Auth)

## Development Status

This project is in active development. The current focus is on building the frontend with mock data before integrating with the backend services.

## Contributing

This is a private project. Please refer to the mission statement and task list for development priorities.

