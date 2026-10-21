interface AvatarProps {
  iniciais?: string | undefined;
  src?: string | undefined;
  alt?: string | undefined;
  size?: "MD" | "LG" | undefined;
  className?: string | undefined;
}

export function Avatar({ iniciais = "?", src, alt, size = "MD", className }: AvatarProps) {
  // MD = 40px (size-10), LG = 56px (size-14)
  const sizeClass = size === "LG" ? "size-14 text-heading-h3" : "size-10 text-caption-strong";

  return (
    <div
      className={[
        "relative flex items-center justify-center rounded-full shrink-0",
        "bg-accent-subtle border border-border-default overflow-hidden",
        sizeClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {src ? (
        <img src={src} alt={alt ?? iniciais} className="size-full object-cover" />
      ) : (
        <span className="font-semibold text-accent-default">{iniciais}</span>
      )}
    </div>
  );
}
