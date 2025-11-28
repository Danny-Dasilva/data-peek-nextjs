'use client'

import * as React from 'react'
import Editor, { loader, type Monaco, type OnMount } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { formatSQL } from '@/lib/sql-formatter'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'

// Configure Monaco workers for Vite + Electron (avoids CSP issues)
self.MonacoEnvironment = {
  getWorker(_: unknown, _label: string) {
    return new editorWorker()
  }
}

// Configure Monaco to use local files instead of CDN (required for Electron CSP)
loader.config({ monaco })

type EditorType = monaco.editor.IStandaloneCodeEditor

export interface SQLEditorProps {
  value: string
  onChange?: (value: string) => void
  onRun?: () => void
  onFormat?: () => void
  readOnly?: boolean
  height?: string | number
  minHeight?: string | number
  className?: string
  placeholder?: string
  compact?: boolean
}

// Custom dark theme inspired by the app's aesthetic
const defineCustomTheme = (monaco: Monaco) => {
  monaco.editor.defineTheme('data-peek-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '60a5fa', fontStyle: 'bold' }, // blue-400
      { token: 'keyword.sql', foreground: '60a5fa', fontStyle: 'bold' },
      { token: 'operator.sql', foreground: 'c084fc' }, // purple-400
      { token: 'string', foreground: '4ade80' }, // green-400
      { token: 'string.sql', foreground: '4ade80' },
      { token: 'number', foreground: 'fb923c' }, // orange-400
      { token: 'number.sql', foreground: 'fb923c' },
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' }, // gray-500
      { token: 'comment.sql', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'e5e7eb' }, // gray-200
      { token: 'predefined.sql', foreground: 'f472b6' }, // pink-400
      { token: 'type', foreground: 'fbbf24' } // amber-400
    ],
    colors: {
      'editor.background': '#0a0a0a',
      'editor.foreground': '#e5e7eb',
      'editor.lineHighlightBackground': '#1f1f2310',
      'editor.selectionBackground': '#3b82f640',
      'editor.inactiveSelectionBackground': '#3b82f620',
      'editorCursor.foreground': '#60a5fa',
      'editorLineNumber.foreground': '#4b5563',
      'editorLineNumber.activeForeground': '#9ca3af',
      'editor.selectionHighlightBackground': '#3b82f620',
      'editorIndentGuide.background': '#27272a',
      'editorIndentGuide.activeBackground': '#3f3f46',
      'editorBracketMatch.background': '#3b82f630',
      'editorBracketMatch.border': '#3b82f6',
      'scrollbarSlider.background': '#27272a80',
      'scrollbarSlider.hoverBackground': '#3f3f4680',
      'scrollbarSlider.activeBackground': '#52525b80'
    }
  })

  monaco.editor.defineTheme('data-peek-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '2563eb', fontStyle: 'bold' }, // blue-600
      { token: 'keyword.sql', foreground: '2563eb', fontStyle: 'bold' },
      { token: 'operator.sql', foreground: '9333ea' }, // purple-600
      { token: 'string', foreground: '16a34a' }, // green-600
      { token: 'string.sql', foreground: '16a34a' },
      { token: 'number', foreground: 'ea580c' }, // orange-600
      { token: 'number.sql', foreground: 'ea580c' },
      { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' }, // gray-400
      { token: 'comment.sql', foreground: '9ca3af', fontStyle: 'italic' },
      { token: 'identifier', foreground: '1f2937' }, // gray-800
      { token: 'predefined.sql', foreground: 'db2777' }, // pink-600
      { token: 'type', foreground: 'd97706' } // amber-600
    ],
    colors: {
      'editor.background': '#fafafa',
      'editor.foreground': '#1f2937',
      'editor.lineHighlightBackground': '#f4f4f510',
      'editor.selectionBackground': '#3b82f630',
      'editor.inactiveSelectionBackground': '#3b82f615',
      'editorCursor.foreground': '#2563eb',
      'editorLineNumber.foreground': '#d1d5db',
      'editorLineNumber.activeForeground': '#6b7280',
      'editor.selectionHighlightBackground': '#3b82f615',
      'editorIndentGuide.background': '#e5e7eb',
      'editorIndentGuide.activeBackground': '#d1d5db',
      'editorBracketMatch.background': '#3b82f620',
      'editorBracketMatch.border': '#3b82f6',
      'scrollbarSlider.background': '#e5e7eb80',
      'scrollbarSlider.hoverBackground': '#d1d5db80',
      'scrollbarSlider.activeBackground': '#9ca3af80'
    }
  })
}

export function SQLEditor({
  value,
  onChange,
  onRun,
  onFormat,
  readOnly = false,
  height = 200,
  minHeight,
  className,
  placeholder = 'SELECT * FROM your_table LIMIT 100;',
  compact = false
}: SQLEditorProps) {
  const { theme } = useTheme()
  const editorRef = React.useRef<EditorType | null>(null)
  const monacoRef = React.useRef<Monaco | null>(null)

  // Resolve system theme
  const resolvedTheme = React.useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }, [theme])

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Define custom themes
    defineCustomTheme(monaco)

    // Set the theme based on current app theme
    const editorTheme = resolvedTheme === 'dark' ? 'data-peek-dark' : 'data-peek-light'
    monaco.editor.setTheme(editorTheme)

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun?.()
    })

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        if (onFormat) {
          onFormat()
        } else {
          // Format in place
          const currentValue = editor.getValue()
          const formatted = formatSQL(currentValue)
          editor.setValue(formatted)
          onChange?.(formatted)
        }
      }
    )

    // Configure editor for SQL
    editor.updateOptions({
      fontSize: compact ? 12 : 13,
      lineHeight: compact ? 18 : 22,
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', Monaco, Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: !compact && typeof height === 'number' && height > 150 },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: compact ? 'off' : 'on',
      glyphMargin: false,
      folding: !compact,
      lineDecorationsWidth: compact ? 0 : 10,
      lineNumbersMinChars: compact ? 0 : 3,
      renderLineHighlight: 'line',
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8
      },
      padding: {
        top: compact ? 8 : 12,
        bottom: compact ? 8 : 12
      },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      roundedSelection: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      contextmenu: true,
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: 'currentDocument',
      bracketPairColorization: {
        enabled: true
      }
    })

    // Show placeholder when empty
    if (!value) {
      editor.setValue('')
    }
  }

  // Update theme when it changes
  React.useEffect(() => {
    if (monacoRef.current) {
      const editorTheme = resolvedTheme === 'dark' ? 'data-peek-dark' : 'data-peek-light'
      monacoRef.current.editor.setTheme(editorTheme)
    }
  }, [resolvedTheme])

  const handleChange = (newValue: string | undefined) => {
    onChange?.(newValue ?? '')
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border/50',
        'bg-background/50 backdrop-blur-sm',
        'transition-all duration-200',
        'focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20',
        className
      )}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: minHeight ? (typeof minHeight === 'number' ? `${minHeight}px` : minHeight) : undefined
      }}
    >
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme={resolvedTheme === 'dark' ? 'data-peek-dark' : 'data-peek-light'}
        loading={
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading editor...</div>
          </div>
        }
        options={{
          readOnly,
          domReadOnly: readOnly
        }}
      />
      {!value && (
        <div
          className={cn(
            'pointer-events-none absolute font-mono text-muted-foreground/50',
            compact ? 'left-2 top-2 text-xs' : 'left-[52px] top-3 text-sm'
          )}
        >
          {placeholder}
        </div>
      )}
    </div>
  )
}

export default SQLEditor
