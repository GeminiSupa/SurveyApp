export default function ParticipantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#030711] px-4 pb-6 pt-4">
      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 rounded-full bg-[var(--brand)]" />
      </div>
      {children}
    </div>
  );
}
