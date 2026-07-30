import { redirect } from 'next/navigation';

/**
 * Legacy `/dashboard/soc` → canonical live SOC at `/security`.
 * The security hub already aggregates MAS incidents, network, red-team,
 * compliance tiles, and OperationalState envelopes (no mock data).
 *
 * @date July 30, 2026
 */
export default function DashboardSocRedirectPage() {
  redirect('/security');
}
