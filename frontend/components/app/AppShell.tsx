'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import TopBar from './TopBar';
import NonTechSidebar from '@/components/sidebar/NonTechSidebar';
import InsightPanel from './InsightPanel';
import { DatasetSheetPanel } from '@/components/dataset/DatasetSheetPanel';
import { CorrectionModal } from '@/components/upload/CorrectionModal';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { DatasetActionsProvider } from '@/lib/context/DatasetActionsContext';
import { DeleteConfirmProvider, useDeleteConfirm } from '@/lib/context/DeleteConfirmContext';
import { DeleteConfirmCard } from '@/components/shared/DeleteConfirmCard';

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { deleteItem, hideDeleteConfirm, performDelete, isDeleting } = useDeleteConfirm();

  const pathname = usePathname();
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240); // Default width in pixels
  const [isHydrated, setIsHydrated] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [datasetSheetOpen, setDatasetSheetOpen] = useState(false);
  const { activeDataset, refreshDatasets } = useDatasets();

  const isWelcomePage = pathname === '/app';

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    const savedWidth = localStorage.getItem('sidebar-width');
    
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed));
    }
    if (savedWidth !== null) {
      setSidebarWidth(JSON.parse(savedWidth));
    }
    setIsHydrated(true);
  }, []);

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed));
    }
  }, [sidebarCollapsed, isHydrated]);

  // Save sidebar width to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('sidebar-width', JSON.stringify(sidebarWidth));
    }
  }, [sidebarWidth, isHydrated]);

  // Handle mouse move for resizing
  useEffect(() => {
    if (!isResizing) return;

    // Add class to body to show resize cursor
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      // Constrain width between 180px and 400px
      if (newWidth >= 180 && newWidth <= 400) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'auto';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'auto';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  return (
    <div className="flex h-screen w-full flex-col bg-surface overflow-hidden">
      <TopBar onMenuClick={() => setMobileRailOpen(true)} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {mobileRailOpen && !isWelcomePage && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileRailOpen(false)}
          />
        )}

        {!isWelcomePage && (
          <div className="relative flex">
            <aside
              className={[
                'flex shrink-0 flex-col',
                !isResizing && 'transition-all duration-200 ease-out',
                'fixed inset-y-14 left-0 z-50 md:relative md:inset-auto md:z-0 md:translate-x-0',
                mobileRailOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
                sidebarCollapsed ? 'w-16' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={!sidebarCollapsed ? { width: `${sidebarWidth}px` } : undefined}
            >
              <NonTechSidebar
                onNavigate={() => setMobileRailOpen(false)}
                onViewDataset={() => setDatasetSheetOpen(true)}
                onSemanticCorrections={() => setCorrectionOpen(true)}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </aside>

            {/* Resize Handle - only show on desktop, when not collapsed */}
            {!sidebarCollapsed && (
              <div
                onMouseDown={() => setIsResizing(true)}
                className="hidden w-1 cursor-col-resize bg-white/5 hover:bg-brand-indigo/50 transition-colors md:block"
                style={{
                  userSelect: isResizing ? 'none' : 'auto',
                  opacity: isResizing ? 1 : 0.3,
                }}
                title="Drag to resize sidebar"
              />
            )}
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
          <DatasetActionsProvider
            onViewDataset={() => setDatasetSheetOpen(true)}
            onSemanticCorrections={() => setCorrectionOpen(true)}
          >
            {children}
            
            {/* Delete Confirmation Card */}
            {deleteItem && (
              <DeleteConfirmCard
                isOpen={!!deleteItem}
                onClose={hideDeleteConfirm}
                onConfirm={async () => {
                  try {
                    await performDelete();
                  } catch {
                    // Error toasts are handled where delete callbacks are defined.
                  } finally {
                    hideDeleteConfirm();
                  }
                }}
                itemType={deleteItem.type}
                itemName={
                  deleteItem.type === 'dataset'
                    ? (deleteItem.item as any).name
                    : (deleteItem.item as any).title || 'Untitled'
                }
                isLoading={isDeleting}
              />
            )}
          </DatasetActionsProvider>
        </main>

        <InsightPanel />
      </div>

      {correctionOpen && activeDataset && (
        <CorrectionModal
          datasetId={activeDataset.id}
          onClose={() => setCorrectionOpen(false)}
          onSuccess={() => {
            setCorrectionOpen(false);
            void refreshDatasets();
          }}
        />
      )}

      {datasetSheetOpen && activeDataset && (
        <DatasetSheetPanel
          open={datasetSheetOpen}
          onClose={() => setDatasetSheetOpen(false)}
          datasetId={activeDataset.id}
          datasetName={activeDataset.name}
        />
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DeleteConfirmProvider>
      <AppShellContent>{children}</AppShellContent>
    </DeleteConfirmProvider>
  );
}
