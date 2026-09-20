import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Receipt,
  HeartPulse,
  GraduationCap,
  Film,
  Plane,
  Tv,
  User,
  MoreHorizontal,
  Briefcase,
  Laptop,
  Building2,
  TrendingUp,
  Gift,
  RotateCcw,
  PlusCircle,
  Tag,
} from 'lucide-react';

export interface CategoryIconProps {
  iconName: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  size = 20,
  className = '',
}) => {
  switch (iconName.toLowerCase()) {
    case 'utensils':
    case 'food':
      return <Utensils size={size} className={className} />;
    case 'shopping-cart':
    case 'groceries':
      return <ShoppingCart size={size} className={className} />;
    case 'car':
    case 'transport':
      return <Car size={size} className={className} />;
    case 'shopping-bag':
    case 'shopping':
      return <ShoppingBag size={size} className={className} />;
    case 'receipt':
    case 'bills':
      return <Receipt size={size} className={className} />;
    case 'heart-pulse':
    case 'health':
      return <HeartPulse size={size} className={className} />;
    case 'graduation-cap':
    case 'education':
      return <GraduationCap size={size} className={className} />;
    case 'film':
    case 'entertainment':
      return <Film size={size} className={className} />;
    case 'plane':
    case 'travel':
      return <Plane size={size} className={className} />;
    case 'tv':
    case 'subscriptions':
      return <Tv size={size} className={className} />;
    case 'user':
    case 'personal':
      return <User size={size} className={className} />;
    case 'more-horizontal':
    case 'other':
      return <MoreHorizontal size={size} className={className} />;
    case 'briefcase':
    case 'salary':
      return <Briefcase size={size} className={className} />;
    case 'laptop':
    case 'freelance':
      return <Laptop size={size} className={className} />;
    case 'building-2':
    case 'business':
      return <Building2 size={size} className={className} />;
    case 'trending-up':
    case 'interest':
      return <TrendingUp size={size} className={className} />;
    case 'gift':
      return <Gift size={size} className={className} />;
    case 'rotate-ccw':
    case 'refund':
      return <RotateCcw size={size} className={className} />;
    case 'plus-circle':
    case 'other-income':
    case 'other_income':
      return <PlusCircle size={size} className={className} />;
    default:
      return <Tag size={size} className={className} />;
  }
};
