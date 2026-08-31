import { redirect } from 'next/navigation';

/** /app/launchpad has no index — send signed-in users to the workspace. */
export default function LaunchpadAppIndex() {
  redirect('/app/launchpad/dashboard');
}
