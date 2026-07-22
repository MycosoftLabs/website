import HitlTabletopConsole from '@/components/security/HitlTabletopConsole';

// IR.L2-3.6.3 human-in-the-loop tabletop facilitation console.
// Reachable from the Tabletop section of the Tier-1 panel on /security/compliance,
// so the exercise can be re-run on demand for each annual/periodic test.
export const metadata = {
  title: 'IR Tabletop Console | Mycosoft Security',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function TabletopPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <HitlTabletopConsole />
    </div>
  );
}
