import React from 'react';
import {
  Diamond,
  Feather,
  Heart,
  Star,
  Sparkles,
  Gift,
  Truck,
  ShieldCheck,
  Leaf,
  Scissors,
  Crown,
  ShoppingBag,
  RefreshCw,
  Award,
  type LucideProps,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  diamond: Diamond,
  feather: Feather,
  heart: Heart,
  star: Star,
  sparkles: Sparkles,
  gift: Gift,
  truck: Truck,
  'shield-check': ShieldCheck,
  leaf: Leaf,
  scissors: Scissors,
  crown: Crown,
  'shopping-bag': ShoppingBag,
  refresh: RefreshCw,
  award: Award,
};

interface ExperienceIconProps extends Omit<LucideProps, 'name'> {
  name?: string | null;
}

export const ExperienceIcon: React.FC<ExperienceIconProps> = ({ name, ...props }) => {
  const normalizedKey = (name || '').trim().toLowerCase();
  const IconComponent = ICON_MAP[normalizedKey] || Sparkles;

  return <IconComponent {...props} />;
};

export const SUPPORTED_EXPERIENCE_ICONS = Object.keys(ICON_MAP);
