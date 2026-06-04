/** Providers: global UI state → Fluent theme → TanStack Query → Router. */

import { FluentProvider } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AppStateProvider, useAppState } from './app/AppState';
import { appDarkTheme, appLightTheme } from './app/theme';
import { router } from './app/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Themed() {
  const { themeMode } = useAppState();
  return (
    <FluentProvider
      theme={themeMode === 'dark' ? appDarkTheme : appLightTheme}
      className={themeMode === 'dark' ? 'theme-dark' : 'theme-light'}
      style={{ height: '100%' }}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </FluentProvider>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Themed />
    </AppStateProvider>
  );
}
