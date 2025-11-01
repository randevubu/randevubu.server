import { getContext, runWithContext, RequestContext } from './asyncContext';

/**
 * Run background task with preserved context
 */
export function runBackgroundTask<T>(
  task: () => Promise<T>
): Promise<T> {
  const currentContext = getContext();
  
  return new Promise<T>((resolve, reject) => {
    setImmediate(async () => {
      try {
        const result = await runWithContext(currentContext || { requestId: 'background-task' }, task);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Run background task with explicit context
 */
export function runBackgroundTaskWithContext<T>(
  context: RequestContext,
  task: () => Promise<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setImmediate(async () => {
      try {
        const result = await runWithContext(context, task);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}
