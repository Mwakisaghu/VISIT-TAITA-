export default function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-xs text-stone/70">
      Sample content for preview — {children}
    </p>
  );
}
