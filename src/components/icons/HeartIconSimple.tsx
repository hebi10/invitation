import Image from 'next/image';

interface HeartIconProps {
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}

export default function HeartIcon({
  className,
  priority = false,
  width = 160,
  height = 136,
}: HeartIconProps) {
  return (
    <Image
      src="/images/icon_heart_1.png"
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
