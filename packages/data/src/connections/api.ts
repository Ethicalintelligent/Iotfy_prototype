import { DataError, type Connection } from '../types';

/** api: the future Java backend. Placeholder so screens keep working unchanged when it arrives. */
export function apiConnection(): Connection {
  const notYet = () =>
    Promise.reject(
      new DataError(
        'The api connection (Java backend) is not built yet. Use VITE_DATA_MODE=neon-dev.',
        { code: 'not_built' },
      ),
    );
  return { mode: 'api', query: notYet, transaction: notYet };
}
