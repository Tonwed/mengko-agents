/**
 * ProvidersSettingsPage
 *
 * Master-detail layout for managing AI provider connections.
 * Left panel: scrollable list of connections.
 * Right panel: selected connection details (endpoint, auth, models, actions).
 *
 * Reuses validate / delete / rename / setDefault / edit logic from AiSettingsPage.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from '@/context/LanguageContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Pencil,
  Trash2,
  Star,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Settings2,
} from 'lucide-react'
import { Spinner, FullscreenOverlayBase } from '@craft-agent/ui'
import { useAtomValue, useSetAtom } from 'jotai'
import { fullscreenOverlayOpenAtom } from '@/atoms/overlay'
import { selectedProviderSlugAtom } from '@/atoms/providers'
import type { LlmConnectionWithStatus } from '../../../shared/types'
import type { DetailsPageMeta } from '@/lib/navigation-registry'
import { cn } from '@/lib/utils'
import { ConnectionIcon } from '@/components/icons/ConnectionIcon'
import { RenameDialog } from '@/components/ui/rename-dialog'
import { useAppShellContext } from '@/context/AppShellContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { OnboardingWizard, type ApiSetupMethod } from '@/components/onboarding'
import { getModelsForProviderType } from '@config/llm-connections'
import type { ModelDefinition } from '@config/models'

export const meta: DetailsPageMeta = {
  navigator: 'settings',
  slug: 'providers',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type ValidationState = 'idle' | 'validating' | 'success' | 'error'

function getProviderLabel(connection: LlmConnectionWithStatus): string {
  const provider = connection.providerType || connection.type
  const isSubscription = connection.authType === 'oauth'
  switch (provider) {
    case 'anthropic': return isSubscription ? 'Anthropic Subscription' : 'Anthropic API'
    case 'anthropic_compat': return 'Anthropic Compatible'
    case 'bedrock': return 'AWS Bedrock'
    case 'vertex': return 'Google Vertex'
    case 'pi': return 'Craft Agents Backend'
    case 'pi_compat': return 'Craft Agents Backend Compatible'
    default: return provider || 'Unknown'
  }
}

function getApiKeyMethodForConnection(conn: LlmConnectionWithStatus): ApiSetupMethod {
  const provider = conn.providerType || conn.type
  if (provider === 'pi' || provider === 'pi_compat') return 'pi_api_key'
  return 'anthropic_api_key'
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

interface DetailPanelProps {
  connection: LlmConnectionWithStatus
  isLastConnection: boolean
  validationState: ValidationState
  validationError?: string
  onValidate: () => void
  onSetDefault: () => void
  onRenameClick: () => void
  onDelete: () => void
  onEdit: () => void
  onReauthenticate: () => void
}

function DetailPanel({
  connection,
  isLastConnection,
  validationState,
  validationError,
  onValidate,
  onSetDefault,
  onRenameClick,
  onDelete,
  onEdit,
  onReauthenticate,
}: DetailPanelProps) {
  const { t } = useTranslation()
  const [piBaseUrl, setPiBaseUrl] = useState<string | undefined>(undefined)
  const [copiedKey, setCopiedKey] = useState(false)

  useEffect(() => {
    setPiBaseUrl(undefined)
    const provider = connection.providerType || connection.type
    if (provider === 'pi' && connection.piAuthProvider && !connection.baseUrl) {
      window.electronAPI.getPiProviderBaseUrl(connection.piAuthProvider).then(url => setPiBaseUrl(url))
    }
  }, [connection.providerType, connection.type, connection.piAuthProvider, connection.baseUrl])

  // Compute endpoint to display
  const endpointDisplay = useMemo(() => {
    if (connection.authType === 'oauth') return null
    let endpoint = connection.baseUrl
    const provider = connection.providerType || connection.type
    if (!endpoint) {
      if (provider === 'anthropic') endpoint = 'https://api.anthropic.com'
      else if (provider === 'pi' && connection.piAuthProvider) endpoint = piBaseUrl
    }
    return endpoint ?? null
  }, [connection, piBaseUrl])

  // Compute model list
  const models = useMemo((): Array<{ id: string; name: string; contextWindow?: number }> => {
    if (connection.models && connection.models.length > 0) {
      return connection.models.map((m: string | ModelDefinition) => {
        if (typeof m === 'string') return { id: m, name: m }
        const def = m as ModelDefinition
        return { id: def.id, name: def.name || def.id, contextWindow: (def as any).contextWindow }
      })
    }
    // Fall back to registry models
    const registryModels = getModelsForProviderType(
      connection.providerType || connection.type,
      connection.piAuthProvider
    )
    return registryModels.map((m: ModelDefinition) => ({
      id: m.id,
      name: m.name || m.id,
      contextWindow: (m as any).contextWindow,
    }))
  }, [connection])

  const handleCopyKey = useCallback(() => {
    // Only trigger visual feedback; keys are not shown in UI
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 1500)
  }, [])

  const validationStatusText = () => {
    if (validationState === 'validating') return t('settings.ai.validating')
    if (validationState === 'success') return t('settings.ai.connectionValid')
    if (validationState === 'error') return validationError || t('settings.ai.validationFailed')
    return null
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-6 py-6 max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <ConnectionIcon connection={connection} size={32} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground truncate">{connection.name}</h2>
              {connection.isDefault && (
                <span className="shrink-0 inline-flex items-center h-5 px-1.5 text-[11px] font-medium rounded-[4px] bg-background shadow-minimal text-foreground/60">
                  {t('settings.providers.defaultBadge')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{getProviderLabel(connection)}</p>
          </div>
        </div>

        {/* Not authenticated warning */}
        {!connection.isAuthenticated && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 mb-5 text-sm text-amber-600 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <span>{t('settings.ai.notAuthenticated')}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Endpoint */}
          {endpointDisplay && (
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {t('settings.providers.endpoint')}
              </h3>
              <div className="bg-background rounded-[8px] shadow-minimal px-3 py-2 text-sm text-foreground/80 font-mono break-all">
                {endpointDisplay}
              </div>
            </section>
          )}

          {/* Authentication */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t('settings.providers.authentication')}
            </h3>
            <div className="bg-background rounded-[8px] shadow-minimal px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-sm text-foreground/80">
                {connection.authType === 'oauth'
                  ? t('settings.providers.oauthToken')
                  : t('settings.providers.apiKey')}
              </span>
              {connection.authType !== 'oauth' && (
                <span className="text-sm font-mono text-muted-foreground tracking-wider">••••••••</span>
              )}
            </div>
          </section>

          {/* Models */}
          {models.length > 0 && (
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {t('settings.providers.models')}
              </h3>
              <div className="bg-background rounded-[8px] shadow-minimal overflow-hidden">
                {models.map((model, idx) => (
                  <div
                    key={model.id}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 text-sm',
                      idx !== 0 && 'border-t border-border/40'
                    )}
                  >
                    <span className="text-foreground/80 truncate font-mono text-xs">{model.id}</span>
                    {model.contextWindow && (
                      <span className="shrink-0 text-xs text-muted-foreground ml-2">
                        {(model.contextWindow / 1000).toFixed(0)}k ctx
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Validation result */}
          {validationState !== 'idle' && (
            <div className={cn(
              'flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm',
              validationState === 'validating' && 'bg-foreground/5 text-muted-foreground',
              validationState === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              validationState === 'error' && 'bg-destructive/10 text-destructive',
            )}>
              {validationState === 'validating' && <Spinner className="h-3.5 w-3.5" />}
              {validationState === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {validationState === 'error' && <AlertTriangle className="h-3.5 w-3.5" />}
              <span>{validationStatusText()}</span>
            </div>
          )}

          {/* Actions */}
          <section className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onValidate}
              disabled={validationState === 'validating'}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('settings.providers.validateConnection')}
            </Button>
            {!connection.isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSetDefault}
                className="gap-1.5"
              >
                <Star className="h-3.5 w-3.5" />
                {t('settings.providers.setAsDefault')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRenameClick}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              {t('settings.providers.rename')}
            </Button>
            {connection.authType === 'oauth' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onReauthenticate}
                className="gap-1.5"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Re-authenticate
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-1.5"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {t('settings.providers.edit')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isLastConnection}
              className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('settings.providers.delete')}
            </Button>
          </section>
        </div>
      </div>
    </ScrollArea>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ProvidersSettingsPage() {
  const { t } = useTranslation()
  const { llmConnections, refreshLlmConnections } = useAppShellContext()

  // Read selected slug from atom (ProvidersListPanel manages the selection)
  const selectedSlug = useAtomValue(selectedProviderSlugAtom)

  const selectedConnection = useMemo(
    () => llmConnections.find(c => c.slug === selectedSlug) ?? null,
    [llmConnections, selectedSlug]
  )

  // ── API setup overlay ──
  const [showApiSetup, setShowApiSetup] = useState(false)
  const [editingConnectionSlug, setEditingConnectionSlug] = useState<string | null>(null)
  const [isDirectEdit, setIsDirectEdit] = useState(false)
  const [editInitialValues, setEditInitialValues] = useState<{
    apiKey?: string
    name?: string
    baseUrl?: string
    connectionDefaultModel?: string
    activePreset?: string
  } | undefined>(undefined)
  const setFullscreenOverlayOpen = useSetAtom(fullscreenOverlayOpenAtom)

  const openApiSetup = useCallback((connectionSlug?: string) => {
    setEditingConnectionSlug(connectionSlug || null)
    setShowApiSetup(true)
    setFullscreenOverlayOpen(true)
  }, [setFullscreenOverlayOpen])

  const closeApiSetup = useCallback(() => {
    setShowApiSetup(false)
    setFullscreenOverlayOpen(false)
    setEditingConnectionSlug(null)
  }, [setFullscreenOverlayOpen])

  const existingSlugs = useMemo(
    () => new Set(llmConnections.map(c => c.slug)),
    [llmConnections]
  )

  const apiSetupOnboarding = useOnboarding({
    initialStep: 'provider-select',
    onConfigSaved: refreshLlmConnections,
    onComplete: () => {
      closeApiSetup()
      refreshLlmConnections?.()
      apiSetupOnboarding.reset()
    },
    onDismiss: () => {
      closeApiSetup()
      apiSetupOnboarding.reset()
    },
    editingSlug: editingConnectionSlug,
    existingSlugs,
  })

  const handleApiSetupFinish = useCallback(() => {
    closeApiSetup()
    refreshLlmConnections?.()
    apiSetupOnboarding.reset()
    setIsDirectEdit(false)
    setEditInitialValues(undefined)
  }, [closeApiSetup, refreshLlmConnections, apiSetupOnboarding])

  const handleCloseApiSetup = useCallback(() => {
    closeApiSetup()
    apiSetupOnboarding.reset()
    setIsDirectEdit(false)
    setEditInitialValues(undefined)
  }, [closeApiSetup, apiSetupOnboarding])

  // ── Rename dialog ──
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renamingConnection, setRenamingConnection] = useState<{ slug: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Validation state ──
  const [validationStates, setValidationStates] = useState<Record<string, { state: ValidationState; error?: string }>>({})

  // ── Handlers ──
  const handleRenameClick = useCallback((connection: LlmConnectionWithStatus) => {
    setRenamingConnection({ slug: connection.slug, name: connection.name })
    setRenameValue(connection.name)
    requestAnimationFrame(() => setRenameDialogOpen(true))
  }, [])

  const handleRenameSubmit = useCallback(async () => {
    if (!renamingConnection || !window.electronAPI) return
    const trimmedName = renameValue.trim()
    if (!trimmedName || trimmedName === renamingConnection.name) {
      setRenameDialogOpen(false)
      return
    }
    try {
      const connection = await window.electronAPI.getLlmConnection(renamingConnection.slug)
      if (connection) {
        const result = await window.electronAPI.saveLlmConnection({ ...connection, name: trimmedName })
        if (result.success) refreshLlmConnections?.()
      }
    } catch (error) {
      console.error('Failed to rename connection:', error)
    }
    setRenameDialogOpen(false)
    setRenamingConnection(null)
    setRenameValue('')
  }, [renamingConnection, renameValue, refreshLlmConnections])

  const handleReauthenticate = useCallback((connection: LlmConnectionWithStatus) => {
    openApiSetup(connection.slug)
    apiSetupOnboarding.reset()
    if (connection.authType === 'oauth') {
      const method = connection.providerType === 'pi'
        ? (connection.piAuthProvider === 'github-copilot' ? 'pi_copilot_oauth' : 'pi_chatgpt_oauth')
        : 'claude_oauth'
      apiSetupOnboarding.handleStartOAuth(method)
    }
  }, [apiSetupOnboarding, openApiSetup])

  const handleEdit = useCallback(async (connection: LlmConnectionWithStatus) => {
    let apiKey: string | undefined
    try {
      apiKey = (await window.electronAPI.getLlmConnectionApiKey(connection.slug)) ?? undefined
    } catch { /* noop */ }

    const modelStr = connection.models
      ?.map((m: string | ModelDefinition) => typeof m === 'string' ? m : m.id)
      .join(', ') || connection.defaultModel || ''

    setEditInitialValues({
      apiKey,
      name: connection.name,
      baseUrl: connection.baseUrl,
      connectionDefaultModel: modelStr,
      activePreset: connection.piAuthProvider || undefined,
    })

    openApiSetup(connection.slug)
    setIsDirectEdit(true)
    const method = getApiKeyMethodForConnection(connection)
    apiSetupOnboarding.jumpToCredentials(method)
  }, [apiSetupOnboarding, openApiSetup])

  const handleDelete = useCallback(async (slug: string) => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.deleteLlmConnection(slug)
      if (result.success) refreshLlmConnections?.()
    } catch (error) {
      console.error('Failed to delete connection:', error)
    }
  }, [refreshLlmConnections])

  const handleValidate = useCallback(async (slug: string) => {
    if (!window.electronAPI) return
    setValidationStates(prev => ({ ...prev, [slug]: { state: 'validating' } }))
    try {
      const result = await window.electronAPI.testLlmConnection(slug)
      if (result.success) {
        setValidationStates(prev => ({ ...prev, [slug]: { state: 'success' } }))
        setTimeout(() => setValidationStates(prev => ({ ...prev, [slug]: { state: 'idle' } })), 3000)
      } else {
        setValidationStates(prev => ({ ...prev, [slug]: { state: 'error', error: result.error } }))
        setTimeout(() => setValidationStates(prev => ({ ...prev, [slug]: { state: 'idle' } })), 5000)
      }
    } catch {
      setValidationStates(prev => ({ ...prev, [slug]: { state: 'error', error: 'Validation failed' } }))
      setTimeout(() => setValidationStates(prev => ({ ...prev, [slug]: { state: 'idle' } })), 5000)
    }
  }, [])

  const handleSetDefault = useCallback(async (slug: string) => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.setDefaultLlmConnection(slug)
      if (result.success) refreshLlmConnections?.()
    } catch (error) {
      console.error('Failed to set default connection:', error)
    }
  }, [refreshLlmConnections])

  const selectedValidation = selectedSlug ? (validationStates[selectedSlug] ?? { state: 'idle' as ValidationState }) : { state: 'idle' as ValidationState }

  return (
    <div className="h-full flex flex-col">
      {selectedConnection ? (
        <DetailPanel
          connection={selectedConnection}
          isLastConnection={llmConnections.length <= 1}
          validationState={selectedValidation.state}
          validationError={selectedValidation.error}
          onValidate={() => handleValidate(selectedConnection.slug)}
          onSetDefault={() => handleSetDefault(selectedConnection.slug)}
          onRenameClick={() => handleRenameClick(selectedConnection)}
          onDelete={() => handleDelete(selectedConnection.slug)}
          onEdit={() => handleEdit(selectedConnection)}
          onReauthenticate={() => handleReauthenticate(selectedConnection)}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('settings.providers.selectProvider')}</p>
        </div>
      )}

      {/* Rename dialog */}
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        value={renameValue}
        onValueChange={setRenameValue}
        onSubmit={handleRenameSubmit}
        title={t('settings.ai.renameConnection')}
        placeholder={t('settings.ai.enterConnectionName')}
      />

      {/* Add / Edit connection overlay */}
      {showApiSetup && (
        <FullscreenOverlayBase isOpen={showApiSetup} onClose={handleCloseApiSetup}>
          <OnboardingWizard
            state={apiSetupOnboarding.state}
            onContinue={apiSetupOnboarding.handleContinue}
            onBack={apiSetupOnboarding.handleBack}
            onSelectApiSetupMethod={apiSetupOnboarding.handleSelectApiSetupMethod}
            onSubmitCredential={apiSetupOnboarding.handleSubmitCredential}
            onStartOAuth={apiSetupOnboarding.handleStartOAuth}
            onSelectProvider={apiSetupOnboarding.handleSelectProvider}
            onSubmitLocalModel={apiSetupOnboarding.handleSubmitLocalModel}
            isWaitingForCode={apiSetupOnboarding.isWaitingForCode}
            onSubmitAuthCode={apiSetupOnboarding.handleSubmitAuthCode}
            onCancelOAuth={apiSetupOnboarding.handleCancelOAuth}
            copilotDeviceCode={apiSetupOnboarding.copilotDeviceCode}
            onBrowseGitBash={apiSetupOnboarding.handleBrowseGitBash}
            onUseGitBashPath={apiSetupOnboarding.handleUseGitBashPath}
            onRecheckGitBash={apiSetupOnboarding.handleRecheckGitBash}
            onClearError={apiSetupOnboarding.handleClearError}
            onClose={handleCloseApiSetup}
            onFinish={handleApiSetupFinish}
            editInitialValues={editInitialValues}
          />
        </FullscreenOverlayBase>
      )}
    </div>
  )
}
