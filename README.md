# MeetUp - Smart Calendar Sync & Group Scheduling

A modern TypeScript monorepo featuring a MeetUp app that syncs calendar data from Google Calendar or user input, allowing users to create groups, send invites, analyze availabilities, and suggest meetup times.

## Tech Stack

- **Turborepo**: Monorepo management
- **React 19**: Latest React with concurrent features
- **Next.js 15**: Web app & marketing page with App Router
- **Tailwind CSS v4**: Modern CSS-first configuration
- **React Native [Expo](https://expo.dev/)**: Mobile/native app with New Architecture
- **[Convex](https://convex.dev)**: Backend, database, server functions
- **[Clerk](https://clerk.dev)**: User authentication
- **react-big-calendar**: Full-featured calendar component
- **date-fns**: Date manipulation utilities

## Features

- **Calendar Sync**: Connect multiple calendar accounts (Google, Outlook, Apple)
- **Smart Scheduling**: AI-powered availability analysis and meeting suggestions
- **Group Management**: Create groups and send invites to team members
- **Real-time Updates**: Live calendar updates across all connected devices
- **Cross-platform**: Web and mobile apps with shared backend
- **End-to-end Type Safety**: From database schema to frontend components
- **User Authentication**: Secure login with Clerk
- **Responsive Design**: Beautiful UI that works on all devices

## Getting Started

### 1. Install dependencies

If you don't have `pnpm` installed, run `npm install --global pnpm`.

```sh
pnpm install
```

### 2. Configure Convex

```sh
npm run setup --workspace packages/backend
```

This will log you into Convex and create a project. You'll need to configure environment variables in the Convex dashboard.

### 3. Configure Clerk Authentication

Follow [this guide](https://docs.convex.dev/auth/clerk) to set up Clerk authentication. Add the `CLERK_ISSUER_URL` from the "convex" template in your [Clerk dashboard](https://dashboard.clerk.com/last-active?path=jwt-templates) to your Convex environment variables.

Enable **Google and Apple** as Social Connection providers for React Native login support.

### 4. Set up Calendar Integration

For calendar sync features, configure OAuth credentials for Google Calendar API in your Convex environment variables.

### 5. Configure Environment Variables

In each app directory (`apps/web`, `apps/native`) create a `.env.local` file using the `.example.env` template:

- Use the `CONVEX_URL` from `packages/backend/.env.local` for `{NEXT,EXPO}_PUBLIC_CONVEX_URL`
- Add Clerk publishable & secret keys from [Clerk dashboard](https://dashboard.clerk.com/last-active?path=api-keys)

### 6. Run the App

```sh
npm run dev
```

This starts the Convex backend, web app, and mobile app. Use ⬆ and ⬇ keys to navigate between logs, or remove `"ui": "tui",` from [turbo.json](./turbo.json) to see all logs together.

## Deploying

In order to both deploy the frontend and Convex, run this as the build command from the apps/web directory:

```sh
cd ../../packages/backend && npx convex deploy --cmd 'cd ../../apps/web && turbo run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

There is a vercel.json file in the apps/web directory with this configuration for Vercel.

## Project Structure

This monorepo contains the MeetUp app with the following structure:

### Apps

- `web`: [Next.js 15](https://nextjs.org/) web application with Tailwind CSS, Clerk authentication, and calendar dashboard
- `native`: [React Native](https://reactnative.dev/) mobile app built with [expo](https://docs.expo.dev/) for calendar access on mobile devices
- `packages/backend`: [Convex](https://www.convex.dev/) backend with calendar accounts, events, and sync functionality

### Key Features

- **Calendar Dashboard**: Full-featured calendar with month/week/day views
- **Account Management**: Connect and manage multiple calendar providers
- **Event Management**: Create, edit, and sync events across platforms
- **Real-time Sync**: Live updates when calendar data changes
- **Responsive UI**: Beautiful, modern interface that works on all devices

All packages are built with [TypeScript](https://www.typescriptlang.org/) for type safety.

### Utilities

This Turborepo has some additional tools already setup for you:

- [Expo](https://docs.expo.dev/) for native development
- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [Prettier](https://prettier.io) for code formatting