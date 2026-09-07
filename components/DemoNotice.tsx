export default function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-xs text-stone/50">
      Sample content for preview — {children}
    </p>
  );
}
