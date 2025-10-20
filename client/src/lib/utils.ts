import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  let locale = 'en-IN';
  if (currency === 'NGN') locale = 'en-NG';
  if (currency === 'USD') locale = 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'U'; // Default initial for undefined/null names
  }
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export const statusColors = {
  active: "bg-green-500/20 text-green-500",
  pending: "bg-yellow-500/20 text-yellow-500",
  verified: "bg-green-500/20 text-green-500",
  completed: "bg-green-500/20 text-green-500",
  upcoming: "bg-blue-500/20 text-blue-500",
  live: "bg-purple-500/20 text-purple-500",
  cancelled: "bg-red-500/20 text-red-500",
  suspended: "bg-red-500/20 text-red-500",
  flagged: "bg-red-500/20 text-red-500",
  banned: "bg-red-500/20 text-red-500",
  rejected: "bg-red-500/20 text-red-500",
  failed: "bg-red-500/20 text-red-500",
  processed: "bg-green-500/20 text-green-500",
  default: "bg-gray-500/20 text-gray-500"
};

export function getStatusColor(status: string): string {
  return statusColors[status as keyof typeof statusColors] || statusColors.default;
}
