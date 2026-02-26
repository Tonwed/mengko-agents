/**
 * ProvidersListPanel
 *
 * Middle-panel list of LLM connections, shown when the user navigates to
 * "Model Providers" in the main left sidebar. Mirrors the pattern of
 * SourcesListPanel / SkillsListPanel.
 *
 * Selection is stored in selectedProviderSlugAtom so the right panel
 * (ProvidersSettingsPage) can read it without prop-drilling.
 */

import * as React from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { AlertTriangle } from 'lucide-react'
import { useSetAtom } from 'jotai'
import { fullscreenOverlayOpenAtom } from '@/atoms/overlay'
import { selectedProviderSlugAtom, addProviderCallbackAtom } from '@/atoms/providers'
import { ConnectionIcon } from '@/components/icons/ConnectionIcon'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/context/LanguageContext'
import { useAppShellContext } from '@/context/AppShellContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { OnboardingWizard } from '@/components/onboarding'
import { FullscreenOverlayBase } from '@craft-agent/ui'
import type { LlmConnectionWithStatus } from '../../../shared/types'

// ─────────────────────────────────────────────────────────────────────────────
// Connection list item
// ─────────────────────────────────────────────────────────────────────────────

const PI_AUTH_PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic API',
  openai: 'OpenAI API',
  'openai-codex': 'OpenAI API',
  google: 'Google AI Studio',
  openrouter: 'OpenRouter',
  'azure-openai-responses': 'Azure OpenAI',
  'amazon-bedrock': 'Amazon Bedrock',
  groq: 'Groq',
  mistral: 'Mistral',
  xai: 'xAI',
  cerebras: 'Cerebras',
  zai: 'z.ai',
  huggingface: 'Hugging Face',
  'vercel-ai-gateway': 'Vercel AI Gateway',
  'github-copilot': 'GitHub Copilot',
}

function getProviderLabel(connection: LlmConnectionWithStatus): string {
  const provider = connection.providerType || connection.type
  const isSubscription = connection.authType === 'oauth'
  switch (provider) {
    case 'anthropic': return isSubscription ? 'Anthropic Subscription' : 'Anthropic API'
    case 'anthropic_compat': return 'Anthropic Compatible'
    case 'bedrock': return 'AWS Bedrock'
    case 'vertex': return 'Google Vertex'
    case 'pi': {
      const piLabel = !isSubscription && connection.piAuthProvider
        ? PI_AUTH_PROVIDER_LABELS[connection.piAuthProvider]
        : null
      return piLabel ?? 'Craft Agents Backend'
    }
    case 'pi_compat': return 'Craft Agents Backend Compatible'
    default: return provider || 'Unknown'
  }
}

interface ConnectionItemProps {
  connection: LlmConnectionWithStatus
  isSelected: boolean
  onClick: () => void
}

function ConnectionItem({ connection, isSelected, onClick }: ConnectionItemProps) {
  const modelCount = connection.models?.length ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-left transition-colors duration-75 select-none',
        isSelected ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.03]'
      )}
    >
      <ConnectionIcon connection={connection} size={20} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-sm font-medium truncate',
            isSelected ? 'text-foreground' : 'text-foreground/80'
          )}>
            {connection.name}
          </span>
          {connection.isDefault && (
            <span className="shrink-0 inline-flex items-center h-4 px-1.5 text-[10px] font-medium rounded-[3px] bg-background shadow-minimal text-foreground/60">
              Default
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {getProviderLabel(connection)}
          {modelCount > 0 && ` · ${modelCount} model${modelCount !== 1 ? 's' : ''}`}
        </p>
      </div>
      {!connection.isAuthenticated && (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────────────

export function ProvidersListPanel() {
  const { t } = useTranslation()
  const { llmConnections, refreshLlmConnections } = useAppShellContext()
  const [selectedSlug, setSelectedSlug] = useAtom(selectedProviderSlugAtom)
  const setFullscreenOverlayOpen = useSetAtom(fullscreenOverlayOpenAtom)
  const setAddProviderCallback = useSetAtom(addProviderCallbackAtom)

  // Auto-select first connection when list changes
  React.useEffect(() => {
    if (llmConnections.length === 0) {
      setSelectedSlug(null)
      return
    }
    if (!selectedSlug || !llmConnections.find(c => c.slug === selectedSlug)) {
      setSelectedSlug(llmConnections[0].slug)
    }
  }, [llmConnections, selectedSlug, setSelectedSlug])

  // ── Add provider wizard ──
  const [showWizard, setShowWizard] = React.useState(false)

  const openWizard = React.useCallback(() => {
    setShowWizard(true)
    setFullscreenOverlayOpen(true)
  }, [setFullscreenOverlayOpen])

  const closeWizard = React.useCallback(() => {
    setShowWizard(false)
    setFullscreenOverlayOpen(false)
    onboarding.reset()
  }, [])  // onboarding ref handled below

  // Register openWizard into the atom so the AppShell header + button can call it
  React.useEffect(() => {
    setAddProviderCallback(() => openWizard)
    return () => setAddProviderCallback(null)
  }, [openWizard, setAddProviderCallback])

  const existingSlugs = React.useMemo(
    () => new Set(llmConnections.map(c => c.slug)),
    [llmConnections]
  )

  const onboarding = useOnboarding({
    initialStep: 'provider-select',
    onConfigSaved: refreshLlmConnections,
    onComplete: () => {
      setShowWizard(false)
      setFullscreenOverlayOpen(false)
      refreshLlmConnections?.()
      onboarding.reset()
    },
    onDismiss: () => {
      setShowWizard(false)
      setFullscreenOverlayOpen(false)
      onboarding.reset()
    },
    existingSlugs,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable connection list */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2 px-2 space-y-0.5">
        {llmConnections.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-10 px-4">
            {t('settings.providers.noConnections')}
          </p>
        )}
        {llmConnections.map(connection => (
          <ConnectionItem
            key={connection.slug}
            connection={connection}
            isSelected={connection.slug === selectedSlug}
            onClick={() => setSelectedSlug(connection.slug)}
          />
        ))}
      </div>

      {/* Add provider wizard overlay */}
      {showWizard && (
        <FullscreenOverlayBase isOpen={showWizard} onClose={closeWizard}>
          <OnboardingWizard
            state={onboarding.state}
            onContinue={onboarding.handleContinue}
            onBack={onboarding.handleBack}
            onSelectApiSetupMethod={onboarding.handleSelectApiSetupMethod}
            onSubmitCredential={onboarding.handleSubmitCredential}
            onStartOAuth={onboarding.handleStartOAuth}
            onSelectProvider={onboarding.handleSelectProvider}
            onSubmitLocalModel={onboarding.handleSubmitLocalModel}
            isWaitingForCode={onboarding.isWaitingForCode}
            onSubmitAuthCode={onboarding.handleSubmitAuthCode}
            onCancelOAuth={onboarding.handleCancelOAuth}
            copilotDeviceCode={onboarding.copilotDeviceCode}
            onBrowseGitBash={onboarding.handleBrowseGitBash}
            onUseGitBashPath={onboarding.handleUseGitBashPath}
            onRecheckGitBash={onboarding.handleRecheckGitBash}
            onClearError={onboarding.handleClearError}
            onClose={closeWizard}
            onFinish={() => {
              setShowWizard(false)
              setFullscreenOverlayOpen(false)
              refreshLlmConnections?.()
              onboarding.reset()
            }}
          />
        </FullscreenOverlayBase>
      )}
    </div>
  )
}
