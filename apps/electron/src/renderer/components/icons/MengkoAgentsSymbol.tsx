interface MengkoAgentsSymbolProps {
  className?: string
}

import mengkoLogo from "@/assets/mengko_logo.png"

/**
 * Mengko Agents symbol - the app icon logo
 * Uses accent color from theme (currentColor from className)
 */
export function MengkoAgentsSymbol({ className }: MengkoAgentsSymbolProps) {
  return (
    <img
      src={mengkoLogo}
      alt="Mengko Agents"
      className={className}
    />
  )
}