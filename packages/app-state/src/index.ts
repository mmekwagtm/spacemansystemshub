import { createStore } from "zustand/vanilla";

export interface AppUiState {
  selectedStoreId: string | undefined;
  selectedOrderId: string | undefined;
  mapPanelOpen: boolean;
  setSelectedStoreId(storeId?: string): void;
  setSelectedOrderId(orderId?: string): void;
  setMapPanelOpen(open: boolean): void;
}

export function createAppUiStore() {
  return createStore<AppUiState>()((set) => ({
    selectedStoreId: undefined,
    selectedOrderId: undefined,
    mapPanelOpen: false,
    setSelectedStoreId: (selectedStoreId) => set({ selectedStoreId }),
    setSelectedOrderId: (selectedOrderId) => set({ selectedOrderId }),
    setMapPanelOpen: (mapPanelOpen) => set({ mapPanelOpen })
  }));
}
