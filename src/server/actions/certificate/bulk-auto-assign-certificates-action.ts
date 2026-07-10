'use server';

import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { certificateService } from '@/server/services/certificate-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import type { BulkAutoAssignReport } from '@/types/certificate-auto-assign-types';
import type { SafeResult } from '@/types/safe-result-types';

export async function bulkAutoAssignCertificatesAction(): Promise<
  SafeResult<BulkAutoAssignReport>
> {
  const session = await requireAuth();

  try {
    const report = await certificateService.bulkAutoAssignUnassignedCertificates();

    if (report.assignedFromDb + report.createdAndAssigned > 0) {
      await auditlogService.log({
        action: 'editCertificate',
        entityType: AUDIT_ENTITY.certificate,
        displayName: `Автопривязка сертификатов: из базы ${report.assignedFromDb}, создано ${report.createdAndAssigned}, пропущено ${report.skippedCount}`,
        adUsername: session.username,
      });
    }

    return { success: true, data: report };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
