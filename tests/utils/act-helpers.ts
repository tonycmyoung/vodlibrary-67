/**
 * Helper utilities for properly wrapping React state updates in act() during testing.
 * These utilities ensure tests handle async operations and state updates correctly.
 */

import { act } from '@testing-library/react'

/**
 * Wraps a function that updates React state, ensuring proper synchronization.
 * Use this for non-user-interaction state updates like mocking, timers, or manual effects.
 */
export async function actAsync<T>(callback: () => Promise<T>): Promise<T> {
  let result: T
  await act(async () => {
    result = await callback()
  })
  return result!
}

/**
 * Wraps synchronous state updates in act().
 * Use this for fireEvent calls or direct state manipulation that's not caught by userEvent.
 */
export function actSync<T>(callback: () => T): T {
  let result: T
  act(() => {
    result = callback()
  })
  return result!
}

/**
 * Wait for an element to appear, properly wrapped in act().
 * Use when waitFor() needs to handle async state updates.
 */
export async function waitForWithAct(
  callback: () => void,
  options?: { timeout?: number }
): Promise<void> {
  return actAsync(async () => {
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        try {
          callback()
          clearInterval(interval)
          resolve()
        } catch {
          // Element not found yet, keep waiting
        }
      }, 50)

      setTimeout(() => {
        clearInterval(interval)
        resolve()
      }, options?.timeout || 1000)
    })
  })
}

/**
 * Properly handle timer-based tests with act().
 * Use for vitest.useFakeTimers() scenarios.
 */
export async function actAdvanceTimers(ms: number): Promise<void> {
  return actAsync(async () => {
    const { advanceTimersByTime } = await import('vitest')
    advanceTimersByTime(ms)
  })
}
