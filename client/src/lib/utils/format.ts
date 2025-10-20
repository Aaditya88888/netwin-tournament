// Utility functions for handling undefined values and formatting

export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) {
    return 'N/A';
  }
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return dateObj.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
};

export const formatDateTime = (date: string | Date | undefined | null): string => {
  if (!date) {
    return 'N/A';
  }
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return dateObj.toLocaleString();
  } catch (error) {
    return 'Invalid Date';
  }
};

export const getInitials = (name: string | undefined | null): string => {
  if (!name) {
    return 'N/A';
  }
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getStatusBadge = (status: string | undefined | null): string => {
  if (!status) {
    return 'Unknown';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const getStatusBadgeClass = (status: string | undefined | null): string => {
  if (!status) {
    return 'bg-gray-500';
  }
  switch (status.toLowerCase()) {
    case 'active':
    case 'live':
    case 'ongoing':
    case 'approved':
      return 'bg-green-500';
    case 'pending':
    case 'upcoming':
      return 'bg-yellow-500';
    case 'completed':
    case 'finished':
      return 'bg-blue-500';
    case 'cancelled':
    case 'rejected':
    case 'failed':
      return 'bg-red-500';
    case 'inactive':
    case 'draft':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

export const getStatusBadgeVariant = (status: string | undefined | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!status) {
    return 'default';
  }
  switch (status.toLowerCase()) {
    case 'active':
    case 'live':
    case 'ongoing':
    case 'approved':
      return 'default';
    case 'pending':
    case 'upcoming':
      return 'secondary';
    case 'cancelled':
    case 'rejected':
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const getStatusColor = (status: string | undefined | null): string => {
  if (!status) {
    return 'text-gray-500';
  }
  switch (status.toLowerCase()) {
    case 'active':
    case 'live':
    case 'ongoing':
    case 'approved':
      return 'text-green-500';
    case 'pending':
    case 'upcoming':
      return 'text-yellow-500';
    case 'completed':
    case 'finished':
      return 'text-blue-500';
    case 'cancelled':
    case 'rejected':
    case 'failed':
      return 'text-red-500';
    case 'inactive':
    case 'draft':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
};

export const getGameInitial = (gameType: string | undefined | null): string => {
  if (!gameType) {
    return 'G';
  }
  return gameType.charAt(0).toUpperCase();
};

export const getKycBadge = (status: string | undefined | null): string => {
  if (!status) {
    return 'Unknown';
  }
  switch (status.toLowerCase()) {
    case 'approved':
    case 'verified':
      return 'Verified';
    case 'pending':
    case 'not_submitted':
      return 'Pending';
    case 'rejected':
      return 'Rejected';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export const safeDivide = (numerator: number | undefined | null, denominator: number | undefined | null): number => {
  if (!numerator || !denominator || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
};

export const safeMultiply = (...args: (number | undefined | null)[]): number => {
  const validNumbers = args.filter(n => n !== undefined && n !== null && !isNaN(n as number)) as number[];
  if (validNumbers.length === 0) {
    return 0;
  }
  return validNumbers.reduce((acc, curr) => acc * curr, 1);
};

export const safeToString = (value: any): string => {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
};

export const safeParseDate = (value: string | Date | undefined | null): Date | null => {
  if (!value) {
    return null;
  }
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};
