/**
 * Do not sell a SKU whose integration is dead.
 * Advisory requires Cal.com (including webhook redeem). Envelope is workspace-only.
 */

import { calcomStatus, type AdvisoryMinutes } from '@/lib/launchpad/advisory/calcom';
import { docusignConfigStatus } from '@/lib/launchpad/signatures/docusign';
import type { CatalogProduct } from '@/lib/launchpad/catalog';

export interface SaleBlock {
  code: string;
  message: string;
}

export function saleBlockForProduct(product: CatalogProduct): SaleBlock | null {
  if (product.kind === 'advisory') {
    const status = calcomStatus();
    if (status.blockingReason) {
      return { code: 'calcom_unconfigured', message: status.blockingReason };
    }
    const minutes = product.advisoryMinutes as AdvisoryMinutes | undefined;
    if (minutes && !status.eventTypes[minutes]) {
      return {
        code: 'calcom_unconfigured',
        message: `Cal.com event type is not set for the ${minutes}-minute advisory.`,
      };
    }
  }
  return null;
}

export function docusignConnectBlock(): SaleBlock | null {
  const status = docusignConfigStatus();
  if (status.oauthClientConfigured) return null;
  return {
    code: 'docusign_unconfigured',
    message: status.blockingReason || 'DocuSign customer OAuth is not configured.',
  };
}
