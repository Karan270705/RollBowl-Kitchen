export const dashboardKeys = {
  summary: (stallId: string, operationsDate: string) => ['dashboard_summary', stallId, operationsDate] as const,
  mostOrdered: (stallId: string, operationsDate: string) => ['dashboard_mostOrdered', stallId, operationsDate] as const,
  paymentBreakdown: (stallId: string, operationsDate: string) => ['dashboard_paymentBreakdown', stallId, operationsDate] as const,
  preparation: (stallId: string, preparationDate: string) => ['dashboard_preparation', stallId, preparationDate] as const,
};

export const ordersKeys = {
  all: ['orders'] as const,
  list: (stallId: string, operationsDate: string) => [...ordersKeys.all, 'list', stallId, operationsDate] as const,
};
