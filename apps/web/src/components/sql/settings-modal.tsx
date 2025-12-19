'use client'

import { Settings, Keyboard } from 'lucide-react'
import { Button } from '@/components/sql/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/sql/ui/dialog'
import { Switch } from '@/components/sql/ui/switch'
import { Label } from '@/components/sql/ui/label'
import { useSettingsStore } from '@/stores/settings-store'

// Helper to detect platform
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
const modKey = isMac ? '⌘' : 'Ctrl'

// Keyboard shortcut display component
function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex items-center gap-0.5">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center">
            {index > 0 && <span className="text-[10px] text-muted-foreground/50 mx-0.5">+</span>}
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted border border-border/50 rounded shadow-sm">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  )
}

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const {
    hideQueryEditorByDefault,
    expandJsonByDefault,
    hideQuickQueryPanel,
    setHideQueryEditorByDefault,
    setExpandJsonByDefault,
    setHideQuickQueryPanel,
    resetSettings
  } = useSettingsStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Settings
          </DialogTitle>
          <DialogDescription>Configure your data-peek preferences.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Query Editor Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Query Editor
            </h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hide-editor">Hide query editor by default</Label>
                <p className="text-xs text-muted-foreground">
                  Start with the query editor collapsed
                </p>
              </div>
              <Switch
                id="hide-editor"
                checked={hideQueryEditorByDefault}
                onCheckedChange={setHideQueryEditorByDefault}
              />
            </div>
          </div>

          {/* Quick Query Panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Quick Query Panel
            </h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hide-quick-query-panel">Hide quick query panel by default</Label>
                <p className="text-xs text-muted-foreground">
                  Hide the quick query panel by default
                </p>
              </div>
              <Switch
                id="hide-quick-query-panel"
                checked={hideQuickQueryPanel}
                onCheckedChange={setHideQuickQueryPanel}
              />
            </div>
          </div>

          {/* JSON Display Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              JSON Display
            </h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="expand-json">Expand JSON by default</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically expand all JSON objects when viewing
                </p>
              </div>
              <Switch
                id="expand-json"
                checked={expandJsonByDefault}
                onCheckedChange={setExpandJsonByDefault}
              />
            </div>
          </div>

          {/* Keyboard Shortcuts Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Keyboard className="size-3.5" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-0.5 border rounded-lg p-3 bg-muted/20">
              <ShortcutRow keys={[modKey, 'K']} description="Command palette" />
              <ShortcutRow keys={[modKey, 'P']} description="Switch connection" />
              <ShortcutRow keys={[modKey, 'I']} description="AI assistant" />
              <ShortcutRow keys={[modKey, 'B']} description="Toggle sidebar" />
              <ShortcutRow keys={[modKey, 'T']} description="New query tab" />
              <ShortcutRow keys={[modKey, 'W']} description="Close tab" />
              <ShortcutRow keys={[modKey, 'Enter']} description="Execute query" />
              <ShortcutRow keys={[modKey, 'Shift', 'F']} description="Format SQL" />
              <ShortcutRow keys={[modKey, 'Shift', '1-9']} description="Switch connection" />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={resetSettings}>
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
