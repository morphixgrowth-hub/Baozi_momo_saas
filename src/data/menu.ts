import { MenuItem } from '../types';

export const SAAS_MENU: MenuItem[] = [
  // Signature Mains
  {
    id: 'm1',
    name: 'Classic Steamed Veg Momos',
    category: 'Signature Mains',
    price: 120,
    description: 'Thin handcrafted wrappers filled with fresh seasonal vegetables and subtle Himalayan herbs. 6 pcs.',
  },
  {
    id: 'm2',
    name: 'Chicken Tikka Baozi',
    category: 'Signature Mains',
    price: 180,
    description: 'Soft steamed open-bao style bun stuffed with charred tandoori spiced chicken breast cubes.',
    popular: true,
  },
  {
    id: 'm3',
    name: 'Kurkure Chicken Momos',
    category: 'Signature Mains',
    price: 190,
    description: 'Golden-crumbed crunchy fried momos seasoned with house masala blend. 6 pcs.',
    popular: true,
  },

  // Beverages
  {
    id: 'bev1',
    name: 'Fresh Lime Soda',
    category: 'Beverages',
    price: 90,
    description: 'Zesty hand-pressed lemon juice with chilled sparkling soda, mint leaf, and rock salt.',
  },
  {
    id: 'bev2',
    name: 'Cold Coffee',
    category: 'Beverages',
    price: 120,
    description: 'Slow-brewed dark roast espresso whipped with chilled whole milk and dark cocoa dust.',
    popular: true,
  },
];

export const RESTAURANT_PROFILE = {
  name: 'Aura Dining SaaS',
  tagline: 'Premium Restaurant Management Platform',
  gstRate: 0.05, // 5% GST as specified
  upiHandle: 'auradining@saasbank',
};
