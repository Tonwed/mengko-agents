import { Sun, Moon, Monitor, Globe } from "lucide-react"
import { StepFormLayout, ContinueButton } from "./primitives"
import { useTheme, type ThemeMode } from "@/context/ThemeContext"
import { useTranslation } from "@/context/LanguageContext"
import { cn } from "@/lib/utils"

interface PreferencesStepProps {
  onContinue: () => void
}

const themeOptions: { value: ThemeMode; labelKey: string; icon: React.ReactNode }[] = [
  { value: 'light', labelKey: 'onboarding.preferences.light', icon: <Sun className="h-5 w-5" /> },
  { value: 'dark', labelKey: 'onboarding.preferences.dark', icon: <Moon className="h-5 w-5" /> },
  { value: 'system', labelKey: 'onboarding.preferences.system', icon: <Monitor className="h-5 w-5" /> },
]

const languageOptions: { value: 'en' | 'zh'; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
]

/**
 * PreferencesStep - Initial preferences setup (theme and language)
 *
 * This is the first step users see, allowing them to set their
 * preferred theme mode and language before entering the app.
 */
export function PreferencesStep({ onContinue }: PreferencesStepProps) {
  const { mode, setMode } = useTheme()
  const { language, setLanguage, t } = useTranslation()

  return (
    <StepFormLayout
      title={t('onboarding.preferences.title')}
      description={t('onboarding.preferences.description')}
      actions={
        <ContinueButton onClick={onContinue} className="w-full">
          {t('onboarding.preferences.continue')}
        </ContinueButton>
      }
    >
      <div className="w-full space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            {t('onboarding.preferences.theme')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                  mode === option.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {option.icon}
                <span className="text-xs font-medium">{t(option.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe className="h-4 w-4" />
            {t('onboarding.preferences.language')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                  language === option.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </StepFormLayout>
  )
}