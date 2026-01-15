# React Single Page Application

This is a React Single Page Application built with Vite, featuring TypeScript, Tailwind CSS, and Axios for API calls.

## Features

- **React 19** with Vite for fast development
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Axios** for API communication
- **ESLint** for code linting
- Clean folder structure with organized components, services, hooks, and utilities
- API service abstraction for easy backend integration

## Project Structure

```
src/
├── components/     # Reusable UI components
├── services/       # API services and external integrations
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── assets/         # Static assets
├── App.tsx         # Main application component
├── main.tsx        # Application entry point
└── index.css       # Global styles with Tailwind
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## API Configuration

The API service is configured in `src/services/api.ts`. Update the `baseURL` in the Axios instance to match your backend API endpoint.

Environment variables can be used for configuration:
- `REACT_APP_API_BASE_URL`: API base URL (defaults to `https://api.example.com`)

## Technologies Used

- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Axios](https://axios-http.com/) - HTTP client
- [ESLint](https://eslint.org/) - Linting

## React Compiler

The React Compiler is enabled for optimized performance. See [React Compiler documentation](https://react.dev/learn/react-compiler) for more information.
