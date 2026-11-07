// @ts-nocheck
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function SaykoApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
