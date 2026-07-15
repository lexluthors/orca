import React, { useState, useCallback, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PlatformIcon } from './platform-icons'
import { useGitPlatformsStore } from './use-git-platforms-store'
import type {
  GitPlatformType,
  GitPlatformTokenType,
  GitPlatformConnection,
  ConnectionTestResult
} from '../../../../shared/git-platforms'
import { GIT_PLATFORM_DEFAULT_URLS, GIT_PLATFORM_LABELS } from '../../../../shared/git-platforms'

interface PlatformConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing connection to edit, or null for creating a new one. */
  editingConnection: GitPlatformConnection | null
}

const PLATFORM_TYPES: GitPlatformType[] = ['github', 'gitlab', 'gitee']
const TOKEN_TYPES: { value: GitPlatformTokenType; label: string }[] = [
  { value: 'pat', label: 'Personal Access Token' },
  { value: 'oauth', label: 'OAuth Token' }
]

export function PlatformConfigDialog({
  open,
  onOpenChange,
  editingConnection
}: PlatformConfigDialogProps): React.JSX.Element {
  const addConnection = useGitPlatformsStore((s) => s.addConnection)
  const updateConnection = useGitPlatformsStore((s) => s.updateConnection)
  const testConnection = useGitPlatformsStore((s) => s.testConnection)

  // Form state
  const [platformType, setPlatformType] = useState<GitPlatformType>('github')
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState(GIT_PLATFORM_DEFAULT_URLS.github)
  const [token, setToken] = useState('')
  const [tokenType, setTokenType] = useState<GitPlatformTokenType>('pat')
  const [showToken, setShowToken] = useState(false)

  // Test state
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)

  // Save state
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editingConnection) {
        setPlatformType(editingConnection.type)
        setName(editingConnection.name)
        setBaseUrl(editingConnection.baseUrl)
        setToken('') // Don't pre-fill token for security
        setTokenType(editingConnection.tokenType)
      } else {
        setPlatformType('github')
        setName('')
        setBaseUrl(GIT_PLATFORM_DEFAULT_URLS.github)
        setToken('')
        setTokenType('pat')
      }
      setShowToken(false)
      setTestResult(null)
      setIsTesting(false)
    }
  }, [open, editingConnection])

  const handlePlatformChange = useCallback((type: GitPlatformType) => {
    setPlatformType(type)
    // Update base URL to default if user hasn't customized it
    const currentDefault = GIT_PLATFORM_DEFAULT_URLS[platformType]
    if (!editingConnection && (!baseUrl || baseUrl === currentDefault)) {
      setBaseUrl(GIT_PLATFORM_DEFAULT_URLS[type])
    }
    setTestResult(null)
  }, [platformType, baseUrl, editingConnection])

  const handleTest = useCallback(async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection({
        type: platformType,
        baseUrl,
        token,
        tokenType
      })
      setTestResult(result)
    } catch (err: any) {
      setTestResult({ success: false, error: err.message ?? 'Test failed' })
    } finally {
      setIsTesting(false)
    }
  }, [testConnection, platformType, baseUrl, token, tokenType])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      if (editingConnection) {
        const patch: Record<string, any> = { name, baseUrl }
        if (token) patch.token = token
        patch.tokenType = tokenType
        await updateConnection(editingConnection.id, patch)
      } else {
        await addConnection({
          type: platformType,
          name,
          baseUrl,
          token,
          tokenType
        })
      }
      onOpenChange(false)
    } catch {
      // Error is handled by the store
    } finally {
      setIsSaving(false)
    }
  }, [editingConnection, platformType, name, baseUrl, token, tokenType, addConnection, updateConnection, onOpenChange])

  const isValid = name.trim() !== '' && baseUrl.trim() !== '' && token.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingConnection ? 'Edit Platform Connection' : 'Add Platform Connection'}
          </DialogTitle>
          <DialogDescription>
            Configure a connection to a Git hosting platform.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Platform type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Platform</label>
            <div className="flex gap-2">
              {PLATFORM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handlePlatformChange(type)}
                  disabled={!!editingConnection}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    platformType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted',
                    editingConnection && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <PlatformIcon type={type} className="size-4" />
                  {GIT_PLATFORM_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Connection name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <Input
              placeholder={`My ${GIT_PLATFORM_LABELS[platformType]}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Base URL</label>
            <Input
              placeholder={GIT_PLATFORM_DEFAULT_URLS[platformType]}
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value)
                setTestResult(null)
              }}
            />
          </div>

          {/* Token type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Token Type</label>
            <div className="flex gap-2">
              {TOKEN_TYPES.map((tt) => (
                <button
                  key={tt.value}
                  type="button"
                  onClick={() => {
                    setTokenType(tt.value)
                    setTestResult(null)
                  }}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    tokenType === tt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {tt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Token */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Access Token</label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value)
                  setTestResult(null)
                }}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
              >
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={cn(
                'flex items-start gap-2 rounded-md border p-3 text-sm',
                testResult.success
                  ? 'border-green-600/30 bg-green-600/5 text-green-700 dark:text-green-400'
                  : 'border-destructive/30 bg-destructive/5 text-destructive'
              )}
            >
              {testResult.success ? (
                <CheckCircle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0" />
              )}
              <div className="flex-1">
                {testResult.success ? (
                  <p>
                    Connected as <strong>{testResult.user}</strong>
                    {testResult.latencyMs !== undefined && (
                      <span className="ml-1 text-muted-foreground">
                        ({testResult.latencyMs}ms)
                      </span>
                    )}
                  </p>
                ) : (
                  <p>{testResult.error ?? 'Connection failed'}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!isValid || isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : editingConnection ? (
              'Save Changes'
            ) : (
              'Add Connection'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
