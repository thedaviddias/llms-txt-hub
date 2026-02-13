import pc from 'picocolors'

const BANNER_LINES = [
  ' ██╗     ██╗     ███╗   ███╗███████╗████████╗██╗  ██╗████████╗',
  ' ██║     ██║     ████╗ ████║██╔════╝╚══██╔══╝╚██╗██╔╝╚══██╔══╝',
  ' ██║     ██║     ██╔████╔██║███████╗   ██║    ╚███╔╝    ██║   ',
  ' ██║     ██║     ██║╚██╔╝██║╚════██║   ██║    ██╔██╗    ██║   ',
  ' ███████╗███████╗██║ ╚═╝ ██║███████║   ██║   ██╔╝ ██╗   ██║   ',
  ' ╚══════╝╚══════╝╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   '
]

// ANSI 256-color gradient: cyan → blue → purple
const GRADIENT_COLORS = [39, 38, 75, 69, 63, 99]

/**
 * Apply ANSI 256-color to a single line of text.
 */
function colorLine(line: string, colorCode: number): string {
  return `\x1b[38;5;${colorCode}m${line}\x1b[0m`
}

/**
 * Print the ASCII art banner with gradient colors, version, and tagline.
 */
export function printBanner(version: string): void {
  const lines = BANNER_LINES.map((line, i) => colorLine(line, GRADIENT_COLORS[i]))
  const output = `\n${lines.join('\n')}\n\n${pc.dim(`  v${version} · Install llms.txt documentation for AI coding tools`)}\n`
  process.stdout.write(output)
}
