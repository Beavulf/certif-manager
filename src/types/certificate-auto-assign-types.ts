export type BulkAutoAssignSuccess = {
  certificateId: string;
  subjectCN: string;
  serialNumber: string;
  employeeName: string;
  action: 'assigned_from_db' | 'created_and_assigned';
};

export type BulkAutoAssignIssue = {
  certificateId: string;
  subjectCN: string;
  serialNumber: string;
  reason: string;
  message: string;
};

export type BulkAutoAssignReport = {
  unassignedTotal: number;
  assignedFromDb: number;
  createdAndAssigned: number;
  skippedCount: number;
  successes: BulkAutoAssignSuccess[];
  issues: BulkAutoAssignIssue[];
};
