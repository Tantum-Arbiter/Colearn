/**
 * Comprehensive Test Suite for EntranceAnimation Components
 * 
 * This file provides utilities and configurations for running all entrance animation tests
 * including unit tests, performance tests, integration tests, and accessibility tests.
 */

export interface TestSuiteConfig {
  runUnitTests: boolean;
  runPerformanceTests: boolean;
  runIntegrationTests: boolean;
  runAccessibilityTests: boolean;
  performanceThresholds: {
    renderTime: number; // milliseconds
    memoryUsage: number; // bytes
    animationInitTime: number; // milliseconds
  };
}

export const defaultTestConfig: TestSuiteConfig = {
  runUnitTests: true,
  runPerformanceTests: true,
  runIntegrationTests: true,
  runAccessibilityTests: true,
  performanceThresholds: {
    renderTime: 50, // 50ms max render time
    memoryUsage: 1024 * 1024, // 1MB max memory increase
    animationInitTime: 100, // 100ms max animation initialization
  },
};

/**
 * Test utilities for entrance animations
 */
export class EntranceAnimationTestUtils {
  /**
   * Measure component render time
   */
  static measureRenderTime(renderFn: () => any): number {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    return endTime - startTime;
  }

  /**
   * Measure memory usage (if available)
   */
  static measureMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Create test data for stress testing
   */
  static createStressTestData(count: number): Array<{
    id: string;
    animationType: 'fade' | 'slide-up' | 'slide-down' | 'scale';
    duration: number;
    delay: number;
  }> {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-${i}`,
      animationType: (['fade', 'slide-up', 'slide-down', 'scale'] as const)[i % 4],
      duration: 200 + (i * 50),
      delay: i * 10,
    }));
  }

  /**
   * Validate animation configuration
   */
  static validateAnimationConfig(config: {
    animationType?: string;
    duration?: number;
    delay?: number;
  }): boolean {
    const validAnimationTypes = ['fade', 'slide-up', 'slide-down', 'scale'];
    
    if (config.animationType && !validAnimationTypes.includes(config.animationType)) {
      return false;
    }
    
    if (config.duration !== undefined && config.duration < 0) {
      return false;
    }
    
    if (config.delay !== undefined && config.delay < 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Generate test scenarios for different animation types
   */
  static generateTestScenarios(): Array<{
    name: string;
    props: {
      animationType: 'fade' | 'slide-up' | 'slide-down' | 'scale';
      duration: number;
      delay: number;
    };
    expectedBehavior: string;
  }> {
    return [
      {
        name: 'Fast fade animation',
        props: { animationType: 'fade', duration: 200, delay: 0 },
        expectedBehavior: 'Should fade in quickly without delay',
      },
      {
        name: 'Delayed slide-up animation',
        props: { animationType: 'slide-up', duration: 500, delay: 300 },
        expectedBehavior: 'Should slide up from bottom after 300ms delay',
      },
      {
        name: 'Quick slide-down animation',
        props: { animationType: 'slide-down', duration: 300, delay: 0 },
        expectedBehavior: 'Should slide down from top immediately',
      },
      {
        name: 'Slow scale animation with delay',
        props: { animationType: 'scale', duration: 800, delay: 500 },
        expectedBehavior: 'Should scale up slowly after 500ms delay',
      },
      {
        name: 'Standard main menu animation',
        props: { animationType: 'fade', duration: 400, delay: 50 },
        expectedBehavior: 'Should fade in with slight delay for main menu',
      },
      {
        name: 'Story page entrance',
        props: { animationType: 'slide-up', duration: 500, delay: 0 },
        expectedBehavior: 'Should slide up immediately for story pages',
      },
    ];
  }
}

/**
 * Performance benchmarks for entrance animations
 */
export class EntranceAnimationBenchmarks {
  private static results: Map<string, number> = new Map();

  /**
   * Run performance benchmark for a specific test
   */
  static benchmark(testName: string, testFn: () => void): number {
    const startTime = performance.now();
    testFn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.results.set(testName, duration);
    return duration;
  }

  /**
   * Get benchmark results
   */
  static getResults(): Map<string, number> {
    return new Map(this.results);
  }

  /**
   * Clear benchmark results
   */
  static clearResults(): void {
    this.results.clear();
  }

  /**
   * Generate performance report
   */
  static generateReport(): string {
    const results = Array.from(this.results.entries());
    const totalTime = results.reduce((sum, [, time]) => sum + time, 0);
    const avgTime = totalTime / results.length;
    
    let report = '=== Entrance Animation Performance Report ===\n\n';
    report += `Total tests: ${results.length}\n`;
    report += `Total time: ${totalTime.toFixed(2)}ms\n`;
    report += `Average time: ${avgTime.toFixed(2)}ms\n\n`;
    report += 'Individual test results:\n';
    
    results
      .sort(([, a], [, b]) => b - a) // Sort by time (slowest first)
      .forEach(([name, time]) => {
        const status = time > 100 ? '⚠️ SLOW' : time > 50 ? '⚡ OK' : '✅ FAST';
        report += `  ${status} ${name}: ${time.toFixed(2)}ms\n`;
      });
    
    return report;
  }
}

/**
 * Test data generators for different scenarios
 */
export class EntranceAnimationTestData {
  /**
   * Generate test children with various complexities
   */
  static generateTestChildren(complexity: 'simple' | 'medium' | 'complex') {
    switch (complexity) {
      case 'simple':
        return { testID: 'simple-child', children: 'Simple text content' };
      
      case 'medium':
        return {
          testID: 'medium-child',
          children: Array.from({ length: 10 }, (_, i) => ({
            key: i,
            testID: `medium-item-${i}`,
            children: `Medium item ${i}`,
          })),
        };
      
      case 'complex':
        return {
          testID: 'complex-child',
          children: Array.from({ length: 50 }, (_, i) => ({
            key: i,
            testID: `complex-item-${i}`,
            children: {
              testID: `complex-nested-${i}`,
              children: Array.from({ length: 5 }, (_, j) => ({
                key: j,
                testID: `complex-deep-${i}-${j}`,
                children: `Deep content ${i}-${j}`,
              })),
            },
          })),
        };
      
      default:
        return { testID: 'default-child', children: 'Default content' };
    }
  }

  /**
   * Generate page transition scenarios
   */
  static generatePageTransitionScenarios() {
    return [
      {
        name: 'Main to Stories transition',
        from: { pageType: 'main', content: 'Main Menu Content' },
        to: { pageType: 'stories', content: 'Stories Page Content' },
        expectedAnimation: 'slide-up',
      },
      {
        name: 'Stories to Settings transition',
        from: { pageType: 'stories', content: 'Stories Content' },
        to: { pageType: 'settings', content: 'Settings Content' },
        expectedAnimation: 'slide-down',
      },
      {
        name: 'Settings to Main transition',
        from: { pageType: 'settings', content: 'Settings Content' },
        to: { pageType: 'main', content: 'Main Menu Content' },
        expectedAnimation: 'fade',
      },
    ];
  }

  /**
   * Generate accessibility test scenarios
   */
  static generateAccessibilityScenarios() {
    return [
      {
        name: 'Screen reader compatibility',
        props: {
          accessibilityLabel: 'Animated content',
          accessibilityRole: 'text' as const,
          accessible: true,
        },
        expectedBehavior: 'Should maintain accessibility properties during animation',
      },
      {
        name: 'Focus management',
        props: {
          accessibilityRole: 'button' as const,
          accessible: true,
          focusable: true,
        },
        expectedBehavior: 'Should handle focus correctly during animation',
      },
      {
        name: 'Reduced motion preference',
        props: {
          accessibilityLabel: 'Motion-sensitive content',
        },
        expectedBehavior: 'Should respect reduced motion preferences',
      },
    ];
  }
}

/**
 * Export all test utilities for easy importing
 */
export {
  EntranceAnimationTestUtils as TestUtils,
  EntranceAnimationBenchmarks as Benchmarks,
  EntranceAnimationTestData as TestData,
};
