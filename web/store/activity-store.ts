import { create } from 'zustand';
import type { ActivityItem } from '@/types/ui';

const MAX_ITEMS = 50;

interface ActivityStore {
  activities: ActivityItem[];
  addActivity: (item: Omit<ActivityItem, 'id'>) => void;
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  activities: [],
  addActivity: (item) =>
    set((state) => ({
      activities: [
        { ...item, id: `${item.ts}-${Math.random().toString(36).slice(2)}` },
        ...state.activities,
      ].slice(0, MAX_ITEMS),
    })),
  clearActivities: () => set({ activities: [] }),
}));
