import Image from "next/image";

type LogoSize = "sm" | "md" | "lg";

export function DharmaLogo({
  size = "md",
  variant = "vertical",
  transparent = false,
}: {
  size?: LogoSize;
  variant?: "vertical" | "horizontal";
  transparent?: boolean;
}) {
  const imageSrc = transparent
    ? "/image__6_-removebg-preview.png"
    : variant === "horizontal"
    ? "/dffimagehorizontal.jpg"
    : "/dffimage.jpg";

  const sizes = {
    sm: { width: 40, height: 40 },
    md: { width: 100, height: 100 },
    lg: { width: 200, height: 200 },
  };

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-24 h-24",
    lg: "w-52 h-52",
  };

  return (
    <Image
      src={imageSrc}
      alt="Dharma Forward Foundation"
      width={sizes[size].width}
      height={sizes[size].height}
      className={`${sizeClasses[size]} object-contain flex-shrink-0`}
      priority
      style={{ margin: 0, padding: 0 }}
    />
  );
}
