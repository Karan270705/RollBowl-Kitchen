import { QueryClient } from '@tanstack/react-query';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (stallId: string, operationsDate: string | null) =>
    ['dashboard', 'summary', stallId, operationsDate || 'null'] as const,
  mostOrdered: (stallId: string, operationsDate: string | null) =>
    ['dashboard', 'mostOrdered', stallId, operationsDate || 'null'] as const,
  paymentBreakdown: (stallId: string, operationsDate: string | null) =>
    ['dashboard', 'paymentBreakdown', stallId, operationsDate || 'null'] as const,
  preparation: (stallId: string, preparationDate: string | null) =>
    ['dashboard', 'preparation', stallId, preparationDate || 'null'] as const,
};

export const ordersKeys = {
  all: ['orders'] as const,
  list: (stallId: string, operationsDate: string | null) =>
    ['orders', 'list', stallId, operationsDate || 'null'] as const,
};

export const walkInKeys = {
  all: ['walk-in-sales'] as const,
  list: (stallId: string, operationsDate: string | null) =>
    ['walk-in-sales', 'list', stallId, operationsDate || 'null'] as const,
};

export const invalidateCanonicalOperationalQueries = (
  queryClient: QueryClient,
  stallId: string,
  operationalDate?: string | null
) => {
  if (operationalDate) {
    queryClient.invalidateQueries({ queryKey: ordersKeys.list(stallId, operationalDate) });
    queryClient.invalidateQueries({ queryKey: walkInKeys.list(stallId, operationalDate) });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.summary(stallId, operationalDate) });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.mostOrdered(stallId, operationalDate) });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.paymentBreakdown(stallId, operationalDate) });
  } else {
    queryClient.invalidateQueries({ queryKey: ordersKeys.all });
    queryClient.invalidateQueries({ queryKey: walkInKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }
};
