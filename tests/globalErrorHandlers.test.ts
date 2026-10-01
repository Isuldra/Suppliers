import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/renderer/globalErrorHandlers';

afterEach(() => vi.restoreAllMocks());

describe('renderer diagnostics', () => {
  it('logs global errors from the bundled handlers', () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('renderer failed');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    expect(logError).toHaveBeenCalledWith('Global error:', error);
  });

  it('logs unhandled promise rejections', () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reason = new Error('initialization failed');
    const event = new Event('unhandledrejection');
    Object.defineProperty(event, 'reason', { value: reason });
    window.dispatchEvent(event);
    expect(logError).toHaveBeenCalledWith('Unhandled promise rejection:', reason);
  });
});
