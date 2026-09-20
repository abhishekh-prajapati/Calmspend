import { App as CapacitorApp } from '@capacitor/app';

type BackHandler = () => boolean | void;

// Stack of modal/sheet dismissal handlers (LIFO)
const backHandlers: BackHandler[] = [];

/**
 * Register a back handler (e.g. for modal / bottom sheet dismissal).
 * Handlers are executed in LIFO order (last registered first).
 * If a handler returns `true` or `void`, it is considered handled and propagation stops.
 * If it returns `false`, execution continues down the stack.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const index = backHandlers.indexOf(handler);
    if (index !== -1) {
      backHandlers.splice(index, 1);
    }
  };
}

let isInitialized = false;

export interface BackButtonNavigationOptions {
  getCurrentPath: () => string;
  navigate: (pathOrDelta: string | number) => void;
}

/**
 * Initializes the Capacitor Android hardware back button listener.
 * Priority order:
 * 1. Open modal / bottom sheet -> close top-most modal
 * 2. Child routes (/expenses/*, /income/*, /transfers/*, /data-management) -> navigate back
 * 3. Secondary top-level tabs (/report, /plan, /net-worth, /settings) -> navigate to /home
 * 4. Root / home route (/home, /) -> exit app
 */
export function initBackButtonService(options: {
  getCurrentPath: () => string;
  navigate: (pathOrDelta: string | number) => void;
}): () => void {
  if (isInitialized) {
    return () => {};
  }
  isInitialized = true;

  let listenerHandle: { remove: () => Promise<void> } | null = null;

  try {
    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      // 1. Check open modal / bottom sheet stack (LIFO)
      if (backHandlers.length > 0) {
        const topHandler = backHandlers.pop();
        if (topHandler) {
          const result = topHandler();
          if (result !== false) {
            return;
          }
        }
      }

      const currentPath = options.getCurrentPath();

      // 2. Child routes -> navigate back to parent
      const childRoutes = [
        '/expenses/new',
        '/income/new',
        '/transfers/new',
        '/data-management',
      ];
      const isChildRoute =
        childRoutes.includes(currentPath) ||
        currentPath.startsWith('/expenses/') ||
        currentPath.startsWith('/income/') ||
        currentPath.startsWith('/transfers/');

      if (isChildRoute) {
        options.navigate(-1);
        return;
      }

      // 3. Secondary top-level tabs -> navigate to /home
      if (
        currentPath === '/report' ||
        currentPath === '/plan' ||
        currentPath === '/net-worth' ||
        currentPath === '/settings'
      ) {
        options.navigate('/home');
        return;
      }

      // 4. Root / home route -> exit application
      if (currentPath === '/home' || currentPath === '/') {
        CapacitorApp.exitApp();
      }
    });

    listenerPromise.then((handle) => {
      listenerHandle = handle;
    }).catch(() => {
      // In browser preview environments where native bridge isn't present
    });
  } catch {
    // Non-native runtime fallback
  }

  return () => {
    isInitialized = false;
    if (listenerHandle) {
      listenerHandle.remove();
    }
  };
}
