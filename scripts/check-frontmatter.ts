import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import yaml from 'js-yaml'
import type { WebsiteMetadata } from '../apps/web/lib/mdx'

const websitesDirectory = path.join(process.cwd(), 'content/websites')

async function checkFrontmatter(filePath?: string) {
  let hasErrors = false
  let hasFixed = false

  const lintAndFixFile = (file: string, content: string): string | null => {
    try {
      // Get content between --- markers
      const parts = content.split('---')
      if (parts.length < 2) {
        console.error(chalk.red(`Error in ${file}: No front matter found`))
        hasErrors = true
        return null
      }

      let yamlContent = parts[1].trim()
      let data: Partial<WebsiteMetadata>

      try {
        // Try to parse the YAML
        data = yaml.load(yamlContent) as Partial<WebsiteMetadata>
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red(`\nError parsing YAML in ${file}:`))
          console.error(chalk.yellow(error.message))
          hasErrors = true
          return null
        }
        return null
      }

      // Check and fix required fields
      const requiredFields: (keyof WebsiteMetadata)[] = [
        'name',
        'description',
        'website',
        'llmsUrl',
        'category',
        'publishedAt'
      ]
      let needsUpdate = false

      requiredFields.forEach(field => {
        if (!data[field]) {
          console.log(chalk.yellow(`\nMissing required field '${field}' in ${file}`))
          if (field === 'publishedAt') {
            const currentDate = new Date().toISOString().split('T')[0]
            data[field] = currentDate
            needsUpdate = true
            hasFixed = true
            console.log(chalk.green(`Added default publishedAt date: ${currentDate}`))
          } else {
            hasErrors = true
          }
        }
      })

      // Fix common formatting issues
      if (data.website && !data.website.startsWith('http')) {
        data.website = `https://${data.website}`
        needsUpdate = true
        hasFixed = true
        console.log(chalk.green(`Fixed website URL in ${file}`))
      }

      if (data.llmsUrl && !data.llmsUrl.startsWith('http')) {
        data.llmsUrl = `https://${data.llmsUrl}`
        needsUpdate = true
        hasFixed = true
        console.log(chalk.green(`Fixed llmsUrl in ${file}`))
      }

      // If we made any changes, update the file
      if (needsUpdate) {
        const newYamlContent = yaml.dump(data, {
          quotingType: "'",
          forceQuotes: true,
          indent: 2,
          lineWidth: 80,
          styles: {
            '!!str': 'style > 80'
          }
        })
        return `---\n${newYamlContent}---\n${parts[2] || ''}`
      }

      return null
    } catch (error) {
      console.error(chalk.red(`Error processing ${file}: ${error}`))
      hasErrors = true
      return null
    }
  }

  if (filePath) {
    // Check a specific file
    const fullPath = path.join(websitesDirectory, filePath)
    if (!fs.existsSync(fullPath)) {
      console.error(chalk.red('File not found:', fullPath))
      return
    }
    const content = fs.readFileSync(fullPath, 'utf8')
    const fixedContent = lintAndFixFile(filePath, content)
    if (fixedContent) {
      fs.writeFileSync(fullPath, fixedContent)
    }
  } else {
    // Check all files
    const files = fs.readdirSync(websitesDirectory)
    files.forEach(file => {
      if (!file.endsWith('.mdx')) return
      const fullPath = path.join(websitesDirectory, file)
      const content = fs.readFileSync(fullPath, 'utf8')
      const fixedContent = lintAndFixFile(file, content)
      if (fixedContent) {
        fs.writeFileSync(fullPath, fixedContent)
      }
    })
  }

  // Report results
  if (hasErrors) {
    console.log(chalk.red('\n❌ Some errors could not be automatically fixed'))
    process.exit(1)
  } else if (hasFixed) {
    console.log(chalk.green('\n✓ All issues have been fixed'))
  } else {
    console.log(chalk.green('\n✓ All front matter is valid'))
  }
}

// Get filename from command line argument if provided
const filename = process.argv[2]
checkFrontmatter(filename).catch(console.error)
