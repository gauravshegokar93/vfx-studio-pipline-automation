export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in zoom-in-[0.99] slide-in-from-bottom-[4px] duration-300 ease-out fill-mode-forwards h-full">
      {children}
    </div>
  );
}
