<p align="center">
  <a href="https://www.metalsmith.io">
    <img alt="Metalsmith" src="https://www.glinka.co/assets/images/metalsmith2025-logo-bug.png" width="80" />
  </a>
</p>
<h1 align="center">
  Metalsmith2025 Simple Starter
</h1>

This is a simple, functional blog starter built with Metalsmith, designed to serve as a learning resource for web developers exploring static site generation. It demonstrates the core concepts of Metalsmith with minimal complexity, making it perfect for beginners while still showcasing the power and flexibility that make Metalsmith a valuable tool in 2025. A demo is available at [ms2025-simple-starter.netlify.app](https://ms2025-simple-starter.netlify.app/).

## Features

### Content & Templating

- **Clean, Minimal Design**: Focused on content with a responsive layout that works on all devices
- **Markdown Content**: Write your content in Markdown
- **Syntax Highlighting**: Code blocks are automatically highlighted
- **Nunjucks Templating**: Flexible and powerful templating with optional custom filters

### Clean URLs with Permalinks

Permalinks offer several benefits, primarily for usability and search engine optimization (SEO):

- **User-Friendly URLs**: Creates clean, easy-to-understand URLs that improve user experience
- **SEO Benefits**: Helps search engines better understand your website's content
- **Consistent Structure**: Maintains a logical URL hierarchy across the entire site
- **No File Extensions**: Removes file extensions like `.html` from URLs

### Blog with Pagination

This starter includes a full-featured blog:

- **Navigation**: Pagination plus previous/next links
- **Featured Posts**: Support for featured blog post lists
- **Latest Posts**: Support for recent content lists

### SEO Features

This starter includes several SEO-friendly features:

- **Sitemap Generation**: A sitemap.xml file is automatically generated in production builds
- **Robots.txt**: A robots.txt file is included and processed with Nunjucks
- **404 Page**: A custom 404 error page that works with Netlify and other hosting providers
- **SEO Metadata**: Each page can include custom title, description, and social image metadata

### Development Experience

- **Live Reloading**: Development server with automatic browser refresh
- **Code Quality Tools**: ESLint and Prettier integration for consistent code style
- **Optimized Build**: HTML minification for production builds
- **Combined Scripts**: Run `npm run fix` to format and lint your code in one command

## Quick start

To get started with this Metalsmith starter You should have Node.js version 18 or higher installed.

1.  **Create a Metalsmith site.**

    Clone the starter repository to create a new blog.

    ```shell
    git clone https://github.com/wernerglinka/metalsmith2025-simple-starter my-blog
    ```

1.  **Start developing.**

    Navigate into your new site’s directory and start it up.

    ```shell
    cd my-blog/
    npm install
    npm start
    ```

1.  **Open the source code and start editing!**

    Your site is now running at `http://localhost:3000`!

    Open the `blog` directory in your code editor of choice and edit any page. Save your changes and the browser will update in real time!

1.  **Available scripts**

    This starter includes several useful scripts:

    ```shell
    npm start            # Start development server with live reloading
    npm run dev          # Run a development build
    npm run build        # Create a production build
    npm run build:subdomain # Create a production build for subdomain deployments
    npm run serve        # Serve the build directory with Browser-Sync
    npm run format       # Format code with Prettier
    npm run lint         # Lint and fix code with ESLint
    npm run fix          # Run both format and lint in sequence
    ```

## What's included?

A quick look at the top-level files and directories you'll see in this Metalsmith project.

    .
    ├── node_modules/       # Dependencies
    ├── src/                # Source content (Markdown)
    ├── lib/                # Project assets and templates
    ├── nunjucks-filters/   # Custom Nunjucks filters
    ├── eslint.config.js    # ESLint configuration
    ├── .gitattributes      # Git attributes configuration
    ├── .gitignore          # Git ignore rules
    ├── .prettierignore     # Prettier ignore rules
    ├── prettier.config.js  # Prettier configuration
    ├── eslint.config.js   # ESLint configuration
    ├── LICENSE             # License file
    ├── metalsmith.js       # Metalsmith configuration
    ├── package-lock.json   # Dependency lock file
    ├── package.json        # Project manifest
    └── README.md           # Project documentation

1. **`node_modules`**: This directory contains all the node modules that your project depends on.

2. **`src`**: This directory contains all the content that makes up your site:
   - **`src/index.md`**: The homepage of your site
   - **`src/blog.md`**: The main blog index page (becomes `/blog/` with pagination)
   - **`src/blog/`**: Individual blog post markdown files
   - **`src/about.md`**: An example content page
   - **`src/404.html`**: Custom 404 error page
   - **`src/robots.txt`**: SEO-friendly robots.txt file

3. **`lib`**: This directory contains all the project assets and templates:
   - **`lib/assets`**: Static assets like images and CSS
   - **`lib/data`**: JSON data files used in templates
   - **`lib/layouts`**: Nunjucks templates used to render content

4. **`nunjucks-filters`**: This directory contains custom filters for the Nunjucks templating engine: Includes filters for formatting dates, manipulating strings, converting markdown to HTML, and more

5. **`eslint.config.js`**: This file contains all rules for ESLint.

6. **`.gitattributes`**: This file tells git how it should handle line endings.

7. **`.gitignore`**: This file tells git which files it should not track / not maintain a version history for.

8. **`.prettierignore`**: This file tells prettier what files it should ignore.

9. **`prettier.config.js`**: This is a configuration file for [Prettier](https://prettier.io/). Prettier is a tool to help keep the formatting of your code consistent.

10. **`eslint.config.js`**: This is a configuration file for [ESLint](https://eslint.org/). ESLint is a tool to help keep the formatting of your code consistent.

11. **`LICENSE`**: This Metalsmith starter is licensed under the MIT license.

12. **`metalsmith.js`**: This is the Metalsmith build file.

13. **`package-lock.json`** (See `package.json` below, first). This is an automatically generated file based on the exact versions of your npm dependencies that were installed for your project. **(You won’t change this file directly).**

14. **`package.json`**: A manifest file for Node.js projects, which includes things like metadata (the project’s name, author, etc). This manifest is how npm knows which packages to install for your project.

15. **`README.md`**: A text file containing useful reference information about your project.

## Learn more about Metalsmith

Looking for more guidance? Full documentation for Metalsmith can be found [on the Metalsmith website](https://www.metalsmith.io).

## Deploy

Deploy and Host on any static hosting service. For example [Netlify](https://www.netlify.com), [Vercel](https://vercel.com/) or [Cloudflare Pages](https://pages.cloudflare.com/).

Here is an article about [how to deploy Metalsmith on Netlify](https://www.netlify.com/blog/2015/12/08/a-step-by-step-guide-metalsmith-on-netlify/). The process is similar for this Metalsmith2025 Simple Starter.

### Subdirectory Deployments

When deploying your site to a subdirectory path (such as GitHub Pages at `https://username.github.io/repository-name/`), special configuration is required to ensure all assets and links work correctly. Without proper handling, your CSS, JavaScript, images, and internal links will break because they'll point to the wrong paths.

This starter is using the [metalsmith-safe-links](https://github.com/wernerglinka/metalsmith-safe-links) plugin for subdirectory deployments. It automatically handles path prefixing for all your site's resources. This plugin:

- Automatically prefixes all relative URLs with the correct base path
- Processes all HTML elements with URLs (links, images, scripts, stylesheets, etc.)
- Handles both absolute and relative URL conversion
- Adds proper attributes to external links (target="\_blank", rel="noopener noreferrer")

To configure your site for subdirectory deployment, ensure the `metalsmith-safe-links` plugin is properly configured in your `metalsmith.js` build file with the appropriate base path for your deployment target. Without this plugin, your deployed site will have broken styling, missing images, and non-functional navigation.

**Available build scripts:**

```shell
npm run build             # Standard build for root domain deployments
npm run build:subdomain   # Build with base path for GitHub Pages
```

**Custom base path:**

```shell
BASE_PATH=/your-path npm run build
```

**GitHub Pages setup:**

1. Enable GitHub Pages in your repository settings
2. Set source to "GitHub Actions"
3. The included workflow (`.github/workflows/deploy.yml`) will automatically build and deploy your site with the correct paths

This approach ensures your site works correctly whether deployed at a root domain (Netlify, Vercel) or in a subdirectory (GitHub Pages, subdomain deployments).

## Join the Metalsmith community at [Gitter](https://gitter.im/metalsmith/community).
