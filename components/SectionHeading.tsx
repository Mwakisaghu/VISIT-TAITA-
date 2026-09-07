export default function SectionHeading({
  title,
  description,
  align = "left",
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <div
        className={`h-1 w-12 bg-rust ${align === "center" ? "mx-auto" : ""}`}
      />
      <h2 className="mt-4 font-display text-3xl text-stone sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p
          className={`mt-3 font-body text-stone/70 ${
            align === "center" ? "mx-auto max-w-md" : "max-w-md"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
