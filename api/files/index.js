/**
 * This file serves as a wrapper for the dynamic route handler in [key].js
 * It's created to ensure compatibility with deployment environments that 
 * might have issues with filenames containing special characters like brackets.
 */

import dynamicFileHandler from './[key].js';

// Simply re-export the handler from [key].js
export default dynamicFileHandler; 