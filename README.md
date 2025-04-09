<div align="center">

# llmx.txt hub

A comprehensive collection of llms.txt implementations and resources for LLM-powered tools and services.

![Screenshot of the llms.txt hub website page](https://raw.githubusercontent.com/thedaviddias/llms-txt-hub/refs/heads/main/apps/web/public/img/llms-txt-hub.jpeg)

</div>

## About

The `llms.txt` file is a standardized way to provide information about how LLM-powered tools and services should interact with your documentation and codebase. This repository serves as a central hub for discovering and sharing `llms.txt` implementations across different projects and platforms.

## Why llms.txt?

The `llms.txt` standard helps:
- 🤖 Guide AI models on how to interpret and use your documentation
- 📚 Standardize documentation access for LLM-powered tools
- 🔍 Improve accuracy of AI responses about your project
- 🛠 Enhance developer experience with AI-powered tools
- 🔒 Set clear boundaries for AI interaction with your content

## Categories

Our list is organized into the following categories:

- **🤖 ai ml**: AI and machine learning platforms, tools, and services
- **📊 data analytics**: Data processing, analytics, and visualization tools
- **💻 developer tools**: Development environments, utilities, and productivity tools
- **☁️ infrastructure cloud**: Cloud platforms and infrastructure services
- **⚡ integration automation**: Automation, integration, and workflow platforms
- **🔒 security identity**: Security, authentication, and identity management solutions
- **🔍 other**: Other innovative tools and platforms

## Developer Tools

Explore these tools to help you work with llms.txt files:

| Tool | Description | Link |
| ---- | ----------- | ---- |
| 🔍 **LLMs.txt Checker** | Chrome extension to check if websites implement llms.txt and llms-full.txt files | [Chrome Web Store](https://chromewebstore.google.com/detail/llmstxt-checker/klcihkijejcgnaiinaehcjbggamippej) |
| 💻 **VS Code Extension** | Search and explore llms.txt files directly in VS Code | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=TheDavidDias.vscode-llms-txt) |
| 🧠 **MCP Explorer** | Explore and analyze llms.txt files using Model Context Protocol | [GitHub](https://github.com/thedaviddias/mcp-llms-txt-explorer) |
| ⚡ **Raycast Extension** | Search and explore llms.txt files directly in Raycast | [Raycast Store](https://www.raycast.com/thedaviddias/llms-txt) |

<!-- LLMS-LIST:START - Do not remove or modify this section -->
## LLM Tools and Resources

A curated list of LLM-powered tools and resources with llms.txt implementation.

### 💻 developer tools

- ![Docker Docs favicon](https://www.google.com/s2/favicons?domain=docs.docker.com&size=128) **[Docker Docs](https://docs.docker.com)** - Official Docker library of resources, manuals, and guides to help you containerize applications. <sub>[llms.txt](https://docs.docker.com/llms.txt)</sub>
- ![Medusa favicon](https://www.google.com/s2/favicons?domain=medusajs.com&size=128) **[Medusa](https://medusajs.com/)** - A digital commerce platform with a built-in framework for customizations. <sub>[llms.txt](https://docs.medusajs.com/llms.txt) • [llms-full.txt](https://docs.medusajs.com/llms-full.txt)</sub>

<!-- LLMS-LIST:END -->

## Getting Started

### Prerequisites

- Node.js 22 or later
- [pnpm](https://pnpm.io/) package manager
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

### Development

1. Install dependencies:
```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install project dependencies
pnpm install
```

2. Set up your environment variables:
```bash
cp .env.example .env.local
```

3. Start the development server:
```bash
# Start the development server
pnpm dev
```

The app should now be running at [http://localhost:3000](http://localhost:3000)


### Building for Production

```bash
# Build the project
pnpm build

# Start the production server
pnpm start
```

### Useful Commands

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test

# Clean up all dependencies and build artifacts
pnpm clean
```

### Adding Your Project

There are three ways to add your project to the list:

#### Option 1: Web Interface (Recommended)

1. [Visit our website](https://llmstxt.com)
2. Log in with your GitHub account (the scope is `public_repo`, which is required to submit a pull request)
3. Submit your website through our user-friendly form
4. Your submission will automatically submit a pull request to this repository and you will get the direct link to your pull request.

#### Option 2: Using the Generator

1. Run the generator command:
```bash
pnpm generate:website
```
2. Follow the prompts to enter your website information:
   - Name of the website/tool
   - Brief description
   - Website URL
   - llms.txt URL
   - Full llms.txt URL (optional)
   - Category (select from available options)
3. The generator will create an MDX file in the correct location
4. Submit a pull request with your changes

#### Option 3: Manual Pull Request

1. Fork this repository
2. Create a new MDX file in the /content/websites directory
3. Ensure your entry includes:
   - Project name, description, website URL, llms.txt URL, and category
4. Submit a pull request

Both methods will go through our validation process to ensure:
- Working links to llms.txt files
- Accurate project descriptions
- Proper categorization
- Consistent formatting

## Support

- 💬 Join our [GitHub Discussions](https://github.com/thedaviddias/llms-txt-hub/discussions)
- 📫 [Report issues](https://github.com/thedaviddias/llms-txt-hub/issues)
- 📖 Check our [Contributing Guide](https://github.com/thedaviddias/llms-txt-hub/blob/main/.github/CONTRIBUTING.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributors

You are welcome to contribute to this project!

- 🐛 [Report bugs](https://github.com/thedaviddias/llms-txt-hub/issues)
- 💡 [Suggest new patterns](https://github.com/thedaviddias/llms-txt-hub/issues/new)
- 📝 [Improve documentation](https://github.com/thedaviddias/llms-txt-hub/blob/main/.github/CONTRIBUTING.md)
- 🔧 [Submit pull requests](https://github.com/thedaviddias/llms-txt-hub/pulls)

Please read our [Contributing Guide](https://github.com/thedaviddias/llms-txt-hub/blob/main/.github/CONTRIBUTING.md) before submitting a pull request.

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jharrell"><img src="https://avatars.githubusercontent.com/u/4829245?v=4?s=100" width="100px;" alt="Jon Harrell"/><br /><sub><b>Jon Harrell</b></sub></a><br /><a href="#content-jharrell" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://drizzle.team"><img src="https://avatars.githubusercontent.com/u/29543764?v=4?s=100" width="100px;" alt="Andrii Sherman"/><br /><sub><b>Andrii Sherman</b></sub></a><br /><a href="#content-AndriiSherman" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Anulo2"><img src="https://avatars.githubusercontent.com/u/28984474?v=4?s=100" width="100px;" alt="_Zaizen_"/><br /><sub><b>_Zaizen_</b></sub></a><br /><a href="#content-Anulo2" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://alexatallah.com"><img src="https://avatars.githubusercontent.com/u/1011391?v=4?s=100" width="100px;" alt="Alex Atallah"/><br /><sub><b>Alex Atallah</b></sub></a><br /><a href="#content-alexanderatallah" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.eliostruyf.com"><img src="https://avatars.githubusercontent.com/u/2900833?v=4?s=100" width="100px;" alt="Elio Struyf"/><br /><sub><b>Elio Struyf</b></sub></a><br /><a href="#content-estruyf" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://merloxx.dev"><img src="https://avatars.githubusercontent.com/u/12734661?v=4?s=100" width="100px;" alt="merloxx"/><br /><sub><b>merloxx</b></sub></a><br /><a href="#content-merloxx" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sean-roberts"><img src="https://avatars.githubusercontent.com/u/950274?v=4?s=100" width="100px;" alt="Sean Roberts"/><br /><sub><b>Sean Roberts</b></sub></a><br /><a href="#content-sean-roberts" title="Content">🖋</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://bendersej.com"><img src="https://avatars.githubusercontent.com/u/10613140?v=4?s=100" width="100px;" alt="Benjamin André-Micolon"/><br /><sub><b>Benjamin André-Micolon</b></sub></a><br /><a href="#content-bendersej" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/HerringtonDarkholme"><img src="https://avatars.githubusercontent.com/u/2883231?v=4?s=100" width="100px;" alt="Herrington Darkholme"/><br /><sub><b>Herrington Darkholme</b></sub></a><br /><a href="#content-HerringtonDarkholme" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://sxzz.moe"><img src="https://avatars.githubusercontent.com/u/6481596?v=4?s=100" width="100px;" alt="Kevin Deng 三咲智子"/><br /><sub><b>Kevin Deng 三咲智子</b></sub></a><br /><a href="#content-sxzz" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/NVGONE"><img src="https://avatars.githubusercontent.com/u/170536944?v=4?s=100" width="100px;" alt="bdjdjdjo"/><br /><sub><b>bdjdjdjo</b></sub></a><br /><a href="#content-NVGONE" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://semgrep.com"><img src="https://avatars.githubusercontent.com/u/1011067?v=4?s=100" width="100px;" alt="Drew Dennison"/><br /><sub><b>Drew Dennison</b></sub></a><br /><a href="#content-DrewDennison" title="Content">🖋</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->


<div align="center">

If you find this project useful, please consider giving it a ⭐️

</div>
