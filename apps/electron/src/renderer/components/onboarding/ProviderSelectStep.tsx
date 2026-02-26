import { cn } from "@/lib/utils"
import { Key, Monitor } from "lucide-react"
import { MengkoAgentsSymbol } from "@/components/icons/MengkoAgentsSymbol"
import { StepFormLayout } from "./primitives"
import { useTranslation } from "@/context/LanguageContext"

import claudeIcon from "@/assets/provider-icons/claude.svg"
import openaiIcon from "@/assets/provider-icons/openai.svg"
import copilotIcon from "@/assets/provider-icons/copilot.svg"

/**
 * The high-level provider choice the user makes on first launch.
 * This maps to one or more ApiSetupMethods downstream.
 */
export type ProviderChoice = 'claude' | 'chatgpt' | 'copilot' | 'api_key' | 'local'

interface ProviderOption {
  id: ProviderChoice
  name: string
  description: string
  icon: React.ReactNode
}

interface ProviderSelectStepProps {
  /** Called when the user selects a provider */
  onSelect: (choice: ProviderChoice) => void
}

/**
 * ProviderSelectStep — First screen after install.
 *
 * Welcomes the user and asks them to pick their subscription / auth method.
 * Selecting a card immediately advances to the next step.
 */
export function ProviderSelectStep({ onSelect }: ProviderSelectStepProps) {
  const { t } = useTranslation()

  const PROVIDER_OPTIONS: ProviderOption[] = [
    {
      id: 'claude',
      name: t('onboarding.providerSelect.claude.name'),
      description: t('onboarding.providerSelect.claude.description'),
      icon: <img src={claudeIcon} alt="" className="size-5 rounded-[3px]" />,
    },
    {
      id: 'chatgpt',
      name: t('onboarding.providerSelect.chatgpt.name'),
      description: t('onboarding.providerSelect.chatgpt.description'),
      icon: <img src={openaiIcon} alt="" className="size-5 rounded-[3px]" />,
    },
    {
      id: 'copilot',
      name: t('onboarding.providerSelect.copilot.name'),
      description: t('onboarding.providerSelect.copilot.description'),
      icon: <img src={copilotIcon} alt="" className="size-5 rounded-[3px]" />,
    },
    {
      id: 'api_key',
      name: t('onboarding.providerSelect.apiKey.name'),
      description: t('onboarding.providerSelect.apiKey.description'),
      icon: <Key className="size-5" />,
    },
    {
      id: 'local',
      name: t('onboarding.providerSelect.local.name'),
      description: t('onboarding.providerSelect.local.description'),
      icon: <Monitor className="size-5" />,
    },
  ]

  return (
    <StepFormLayout
      iconElement={
        <div className="flex size-16 items-center justify-center">
          <MengkoAgentsSymbol className="size-10 text-accent" />
        </div>
      }
      title={t('onboarding.providerSelect.title')}
      description={t('onboarding.providerSelect.description')}
    >
      <div className="space-y-3">
        {PROVIDER_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex w-full items-start gap-4 rounded-xl bg-foreground-2 p-4 text-left transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "hover:bg-foreground/[0.02] shadow-minimal",
            )}
          >
            {/* Icon */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {option.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">{option.name}</span>
              <p className="mt-1 text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </StepFormLayout>
  )
}
