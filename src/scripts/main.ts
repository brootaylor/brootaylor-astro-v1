// The one entry point for the site's site-wide browser JavaScript. BaseLayout.astro loads this
// file, so every page gets it as a single external script (main.<hash>.js). Modules in this
// folder export functions and do nothing on import; this is the only place they're called.
//
// To add a feature: write a module in src/scripts/ that exports an init function, then import
// and call it below.
import { initQuote } from './quote';

initQuote();
