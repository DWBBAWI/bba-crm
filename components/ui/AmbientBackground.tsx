'use client'

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="orb-1 absolute rounded-full opacity-20 blur-3xl"
        style={{
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, #7c3aed 0%, #4f46e5 50%, transparent 70%)',
          top: '-200px',
          left: '-100px',
        }}
      />
      <div
        className="orb-2 absolute rounded-full opacity-15 blur-3xl"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, #2563eb 0%, #06b6d4 50%, transparent 70%)',
          bottom: '-150px',
          right: '-50px',
        }}
      />
      <div
        className="orb-3 absolute rounded-full opacity-10 blur-3xl"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, #7c3aed 0%, #ec4899 50%, transparent 70%)',
          top: '40%',
          right: '30%',
        }}
      />
    </div>
  )
}
