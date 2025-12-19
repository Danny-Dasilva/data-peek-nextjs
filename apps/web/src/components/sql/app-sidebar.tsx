'use client'

import { MessageCircleQuestion, Settings2 } from 'lucide-react'

import { ConnectionSwitcher } from '@/components/sql/connection-switcher'
import { QueryHistory } from '@/components/sql/query-history'
import { SavedQueries } from '@/components/sql/saved-queries'
import { SchemaExplorer } from '@/components/sql/schema-explorer'
import { SidebarQuickQuery } from '@/components/sql/sidebar-quick-query'
import { Dashboards } from '@/components/sql/dashboard'
import type { Dashboard } from '@data-peek/shared'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator
} from '@/components/sql/ui/sidebar'

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onOpenSettings?: () => void
  onSelectDashboard?: (dashboard: Dashboard) => void
}

export function AppSidebar({ onOpenSettings, onSelectDashboard, ...props }: AppSidebarProps) {
  return (
    <Sidebar className="border-r-0 bg-sidebar/80 backdrop-blur-xl" {...props}>
      {/* Header - Connection Switcher */}
      <SidebarHeader className="pt-10">
        <ConnectionSwitcher />
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Quick Query Panel */}
        <SidebarQuickQuery />

        <SidebarSeparator className="mx-3" />

        {/* Schema Explorer */}
        <SchemaExplorer />

        <SidebarSeparator className="mx-3" />

        {/* Query History */}
        <QueryHistory />

        <SidebarSeparator className="mx-3" />

        {/* Saved Queries */}
        <SavedQueries />

        <SidebarSeparator className="mx-3" />

        {/* Dashboards */}
        <Dashboards onSelectDashboard={onSelectDashboard} />

        {/* Secondary Navigation - Settings & Help */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenSettings}>
                  <Settings2 className="size-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a
                    href="https://github.com/Rohithgilla12/data-peek"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircleQuestion className="size-4" />
                    <span>Help</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
