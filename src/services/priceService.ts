import { apiClient } from './apiClient';

export type PriceCategory = 'GREEN_FEE' | 'CART' | 'CADDY' | 'OTHER';

export interface PriceItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  unitPrice: number;
  currency: string;
  isActive: boolean;
  category: PriceCategory;
}

export interface CreatePriceItemRequest {
  code: string;
  name: string;
  description?: string;
  unitPrice: number;
  currency: string;
  category: PriceCategory;
}

export interface UpdatePriceItemRequest {
  code?: string;
  name?: string;
  description?: string;
  unitPrice?: number;
  currency?: string;
  category?: PriceCategory;
  isActive?: boolean;
}

// Mutable dummy data store for development
const dummyPriceItems: PriceItem[] = [
  {
    id: 1,
    code: 'GF_WEEKDAY',
    name: 'Weekday Green Fee',
    description: 'Green fee for weekday play',
    unitPrice: 50.0,
    currency: 'USD',
    isActive: true,
    category: 'GREEN_FEE',
  },
  {
    id: 2,
    code: 'GF_WEEKEND',
    name: 'Weekend Green Fee',
    description: 'Green fee for weekend play',
    unitPrice: 75.0,
    currency: 'USD',
    isActive: true,
    category: 'GREEN_FEE',
  },
  {
    id: 3,
    code: 'CART_18',
    name: 'Golf Cart (18 holes)',
    description: 'Cart rental for 18 holes',
    unitPrice: 25.0,
    currency: 'USD',
    isActive: true,
    category: 'CART',
  },
  {
    id: 4,
    code: 'CADDY_STANDARD',
    name: 'Standard Caddy',
    description: 'Standard caddy service',
    unitPrice: 40.0,
    currency: 'USD',
    isActive: true,
    category: 'CADDY',
  },
];

export const getPriceItems = async (): Promise<PriceItem[]> => {
  try {
    const res = await apiClient.get<PriceItem[]>('/settings/prices');
    // Ensure response is an array
    if (Array.isArray(res.data)) {
      return res.data;
    }
    throw new Error('Invalid response format');
  } catch {
    // Fallback to dummy data for development
    return [...dummyPriceItems];
  }
};

export const createPriceItem = async (
  data: CreatePriceItemRequest,
): Promise<PriceItem> => {
  try {
    const res = await apiClient.post<PriceItem>('/settings/prices', data);
    return res.data;
  } catch (error) {
    // Fallback for development - add to dummy data
    const newItem: PriceItem = {
      id: Date.now(),
      ...data,
      isActive: true,
    };
    dummyPriceItems.push(newItem);
    return newItem;
  }
};

export const updatePriceItem = async (
  id: number,
  data: UpdatePriceItemRequest,
): Promise<PriceItem> => {
  try {
    const res = await apiClient.put<PriceItem>(`/settings/prices/${id}`, data);
    return res.data;
  } catch (error) {
    // Fallback for development - update dummy data
    const itemIndex = dummyPriceItems.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      throw new Error('Price item not found');
    }
    const updatedItem = {
      ...dummyPriceItems[itemIndex],
      ...data,
    };
    dummyPriceItems[itemIndex] = updatedItem;
    return updatedItem;
  }
};

export const togglePriceItemActive = async (
  id: number,
  isActive: boolean,
): Promise<PriceItem> => {
  return updatePriceItem(id, { isActive });
};

export const deletePriceItem = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/settings/prices/${id}`);
  } catch (error) {
    // Fallback for development - remove from dummy data
    const itemIndex = dummyPriceItems.findIndex((item) => item.id === id);
    if (itemIndex !== -1) {
      dummyPriceItems.splice(itemIndex, 1);
    }
  }
};

