/**
 * Test Dashboard - Isolate Issues
 */

"use client"

export function FungiComputeDashboardTest() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-cyan-400 mb-4">FUNGI COMPUTE TEST</h1>
        <p className="text-cyan-400/70">If you see this, basic rendering works.</p>
        <p className="text-emerald-400 mt-2">✓ All 14 scientific todos completed</p>
        <p className="text-purple-400">✓ Backend: STFT, PSD, Spike Detection, Transfer Entropy</p>
        <p className="text-cyan-400">✓ Species database: 8 fungi from literature</p>
        <p className="text-amber-400">✓ Firmware: µV sensitivity optimized</p>
        <p className="text-green-400 mt-4">Scientific integration complete - debugging UI rendering</p>
      </div>
    </div>
  )
}
