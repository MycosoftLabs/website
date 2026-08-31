import { redirect } from 'next/navigation'

/**
 * Legacy route. An early draft branded signup as a capped "Founding 50" cohort
 * — a number lifted from the spec package that was never a real business
 * constraint. Launchpad is not seat-limited and does not publish a seat count.
 * Kept as a redirect only so any link already in the wild still lands somewhere
 * correct; nothing should point here.
 */
export default function LegacyFounding50Redirect() {
  redirect('/fusarium/launchpad/get-started')
}
