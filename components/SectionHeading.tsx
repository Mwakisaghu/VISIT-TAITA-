export default function SectionHeading({
  title,
  description,
  align = "left",
  as: Tag = "h2",
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
  /** The page's own title is an h1 (there must be exactly one per page); headings of sections inside a page stay h2. */
  as?: "h1" | "h2";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <div
        className={`h-1 w-12 bg-rust ${align === "center" ? "mx-auto" : ""}`}
      />
      <Tag className="mt-4 font-display text-3xl text-stone sm:text-3xl">
        {title}
      </Tag>
      {description && (
        <p
          className={`mt-3 font-body text-stone/80 ${
            align === "center" ? "mx-auto max-w-md" : "max-w-md"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
