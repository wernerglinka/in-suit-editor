---
layout: simple.njk
bodyClass: "home"

navigation:
  navLabel: 'Home'
  navIndex: 0

seo:
  title: Metalsmith2025 Simple Starter
  description: "This starter should get you up and running with your new favorite static site generator Metalsmith"
  socialImage: "/assets/images/metalsmith2025-starter-social.png"
  canonicalOverwrite: ""
---
# Welcome to Metalsmith2025 Simple Starter

![Metalsmith2025 Simple Starter](/assets/images/sample.jpg#full-width)

## A Modern Foundation for Static Sites

Welcome to the Metalsmith2025 Simple Starter – a clean, lightweight foundation for your next web project. This starter combines the elegant simplicity of Metalsmith with modern development practices to create a responsive, content-focused website that's easy to understand and extend.

## Opinions Where They Matter

Metalsmith's greatest strength – its ultimate flexibility – can also be its greatest weakness for newcomers. As an "opinion-free" static site generator, Metalsmith gives you complete freedom to build exactly what you want, but this freedom can be overwhelming when you're just starting out.

That's why this starter makes some thoughtful choices for you, while still preserving flexibility where it matters:

- **Nunjucks for templating**: We chose Nunjucks for its powerful control structures, extensibility through custom filters, and familiar syntax that's accessible to anyone with HTML knowledge. If you prefer a different templating engine, Metalsmith makes it easy to swap in alternatives like Handlebars or Pug.

- **Markdown for content**: Simple, readable, and widely supported, Markdown lets you focus on writing without getting lost in markup. It's the perfect balance of simplicity and capability for content creation.

- **Clean URL structure**: Our pagination implementation creates intuitive URLs that both humans and search engines appreciate.

These opinions are based on years of experience with Metalsmith projects, but they're just starting points – you're free to adapt them to your specific needs as you learn.

## What's Included

This starter gives you everything you need to begin building with Metalsmith:

- A responsive, minimalist design that works across all devices
- A fully-functional blog with pagination and article listings
- Simple Markdown content authoring
- Syntax highlighting for code samples
- Flexible Nunjucks templating
- Development server with live reload for quick iteration
- Optimized production builds with minification

## Getting Started

Explore the site to see Metalsmith in action. Visit the [About](/about) page to learn more about this project and the blog series it accompanies. Check out the [Blog](/blog) to see the pagination system and post organization.

Ready to dive into the code? Clone the repository, make some changes to the Markdown files in the `src` directory, and watch as Metalsmith transforms your content into a complete website.

```bash
# Clone the repository
git clone https://github.com/wernerglinka/metalsmith2025-simple-starter.git my-project

# Install dependencies
cd my-project
npm install

# Start the development server
npm run dev
```

## Learn More

This starter is the companion project to a comprehensive blog series on Metalsmith development. Follow along as we explore everything from basic concepts to advanced techniques, using this starter as our foundation.

[Join the Metalsmith community on Gitter](https://gitter.im/metalsmith/community) to connect with other developers and get help with your projects.

Happy building!