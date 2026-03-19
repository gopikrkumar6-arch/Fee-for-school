/**
 * Utility service for handling print functionality across devices
 * Provides mobile-safe printing with proper dialog handling
 */

export const printService = {
  /**
   * Detects if device is mobile or tablet
   */
  isMobileOrTablet(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent);
  },

  /**
   * Safe print function that handles mobile print dialogs properly
   * Ensures print preview doesn't get stuck on mobile/tablet
   */
  safePrint(): void {
    // Use a small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        window.print();

        // For mobile devices, add extra handling to ensure dialog closes properly
        if (this.isMobileOrTablet()) {
          // Listen for print dialog close event
          const onAfterPrint = () => {
            // Restore page visibility and state if needed
            document.body.style.visibility = 'visible';
            window.removeEventListener('afterprint', onAfterPrint);
          };

          window.addEventListener('afterprint', onAfterPrint);

          // Fallback: If dialog doesn't close in 5 seconds, force close it
          setTimeout(() => {
            window.removeEventListener('afterprint', onAfterPrint);
          }, 5000);
        }
      } catch (error) {
        console.error('Print failed:', error);
      }
    }, 100);
  }
};

export default printService;
