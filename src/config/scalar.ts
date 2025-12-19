/**
 * Scalar API Documentation Configuration
 *
 * Scalar is a modern, beautiful API documentation tool that renders OpenAPI/Swagger specs.
 * This configuration defines the theme and behavior of the Scalar documentation UI.
 *
 * @see https://github.com/scalar/scalar
 */

export interface ScalarConfig {
  /**
   * Color theme for the documentation UI
   * @default 'purple'
   */
  theme:
    | 'purple'
    | 'default'
    | 'moon'
    | 'solarized'
    | 'bluePlanet'
    | 'saturn'
    | 'kepler'
    | 'mars'
    | 'deepSpace';

  /**
   * Enable dark mode
   * @default true
   */
  darkMode: boolean;

  /**
   * Layout style
   * @default 'modern'
   */
  layout: 'modern' | 'classic';

  /**
   * Show sidebar navigation
   * @default true
   */
  showSidebar: boolean;

  /**
   * Hide the download button for the OpenAPI spec
   * @default false
   */
  hideDownloadButton: boolean;

  /**
   * Keyboard shortcut for search (without modifier keys)
   * Use Cmd/Ctrl + this key to trigger search
   * @default 'k'
   */
  searchHotKey: string;
}

/**
 * Default Scalar configuration
 */
export const scalarConfig: ScalarConfig = {
  theme: 'purple',
  darkMode: true,
  layout: 'modern',
  showSidebar: true,
  hideDownloadButton: false,
  searchHotKey: 'k',
};

/**
 * Generate Scalar HTML page
 *
 * @param specUrl - URL to the OpenAPI specification JSON
 * @param config - Scalar configuration options
 * @returns HTML string for the Scalar documentation page
 */
export function generateScalarHTML(specUrl: string, config: ScalarConfig = scalarConfig): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>RandevuBu API Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${specUrl}"
      data-configuration='${JSON.stringify(config)}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
  `.trim();
}
