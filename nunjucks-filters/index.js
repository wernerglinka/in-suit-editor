import * as marked from 'marked';

/**
 * Filters to extend Nunjucks environment
 */

/**
 * Converts a string to lowercase
 * @param {string} string - The input string to convert
 * @returns {string} The lowercase string
 */
const toLower = (string) => string.toLowerCase();
/**
 * Converts a string to uppercase
 * @param {string} string - The input string to convert
 * @returns {string} The uppercase string
 */
const toUpper = (string) => string.toUpperCase();
/**
 * Replaces spaces in a string with dashes
 * @param {string} string - The input string to convert
 * @returns {string} The string with spaces replaced by dashes
 */
const spaceToDash = (string) => string.replace(/\s+/g, '-');
/**
 * Condenses a title by removing spaces and converting to lowercase
 * @param {string} string - The input string to condense
 * @returns {string} The condensed string
 */
const condenseTitle = (string) => string.toLowerCase().replace(/\s+/g, '');

/**
 * Removes leading and trailing slashes from a string
 * @param {string} string - The input string to trim
 * @returns {string} The string with leading and trailing slashes removed
 */
const trimSlashes = (string) => string.replace(/(^\/)|(\/$)/g, '');

/**
 * Converts markdown string to HTML
 * @param {string} mdString - The markdown string to convert
 * @returns {string} The HTML output
 */
const mdToHTML = (mdString) => {
  try {
    return marked.parse(mdString, {
      mangle: false,
      headerIds: false
    });
  } catch (e) {
    console.error('Error parsing markdown:', e);
    return mdString;
  }
};

/**
 * Filters a list based on selected IDs
 * @param {Array} list - The full list of items
 * @param {Array} selections - The selected items with IDs
 * @returns {Array} The filtered list containing only selected items
 */
const getSelections = (list, selections) => {
  const filterredList = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < selections.length; j++) {
      if (list[i].id === selections[j].id) {
        filterredList.push(list[i]);
      }
    }
  }
  return filterredList;
};

/**
 * Converts a space-separated string into a unique sorted array of words
 * @param {string} string - The input string to convert
 * @returns {Array} A unique sorted array of words
 * @example
 * // Returns ['category1', 'category2']
 * toArray('category1 category2 category1')
 */
const toArray = (string) => {
  return [ ...new Set(string.trim().split(' ')) ].sort();
};

/**
 * Converts a JavaScript object to a JSON string
 * @param {Object} obj - The object to stringify
 * @returns {string} The JSON string representation of the object
 */
const objToString = (obj) => {
  return JSON.stringify(obj);
};

/**
 * Creates a formatted JSON string representation of an object, handling circular references
 * @param {Object} obj - The object to stringify
 * @returns {string} The formatted JSON string with 4-space indentation
 */
const dump = (obj) => {
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    // The key parameter is required by JSON.stringify but not used in this function

    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    };
  };

  return JSON.stringify(obj, getCircularReplacer(), 4);
};

/**
 * Checks if a post is related to a selection of items
 * @param {Object} post - The post to check
 * @param {Array} selections - The array of selected items
 * @returns {boolean} True if the post is related to any of the selections
 */
const isRelated = (post, selections) => {
  const simpleArray = selections.map((obj) => obj.item);
  if (simpleArray.includes(post.item)) {
    return true;
  }
  return false;
};

/**
 * Trims a string to a specified length and adds ellipsis if needed
 * @param {string} string - The string to trim
 * @param {number} length - The maximum length
 * @returns {string} The trimmed string with ellipsis if it was longer than the specified length
 */
const trimString = (string, length) => {
  if (string.length > length) {
    return `${string.substring(0, length)}...`;
  }
  return string;
};

/**
 * Gets the current year - useful for copyright notices
 * @returns {number} The current year
 */
const currentYear = () => {
  return new Date().getFullYear();
};

/**
 * Formats a date in UTC format
 * @param {Date} date - The date to format
 * @returns {string} The formatted UTC date string
 */
const UTCdate = (date) => date.toUTCString('M d, yyyy');

/**
 * Formats a date string into a readable blog date format (Month Day, Year)
 * @param {string} string - The date string to format
 * @returns {string} The formatted date string
 */
const blogDate = (string) =>
  new Date(string).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Formats a date as dd/mm/yyyy
 * @param {string|Date} dateString - The date to format (defaults to current date if not provided)
 * @returns {string} The formatted date string in dd/mm/yyyy format
 */
const getDate = (dateString) => {
  const date = new Date(dateString || Date.now());
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Formats a date as 'Month Year' (e.g., 'January 2023')
 * @param {string|Date} dateString - The date to format (defaults to current date if not provided)
 * @returns {string} The formatted date string in 'Month Year' format
 */
const getMonthYear = (dateString) => {
  const date = new Date(dateString || Date.now());
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();

  return `${month} ${year}`;
};


export {
  toLower,
  toUpper,
  spaceToDash,
  condenseTitle,
  UTCdate,
  blogDate,
  trimSlashes,
  mdToHTML,
  getSelections,
  toArray,
  dump,
  isRelated,
  objToString,
  currentYear,
  getDate,
  getMonthYear,
  trimString
};
