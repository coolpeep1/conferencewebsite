import Image from "next/image";

export function DharmaLogo({ size = "md", variant = "vertical" }: { size?: "sm" | "md" | "lg"; variant?: "vertical" | "horizontal" }) {
  const imageSrc = variant === "horizontal" ? "/dffimagehorizontal.jpg" : "/dffimage.jpg";
  
  const sizes = {
    sm: { width: 60, height: 60 },
    md: { width: 100, height: 100 },
    lg: { width: 200, height: 200 },
  };

  const sizeClasses = {
    sm: "w-15 h-15",
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
