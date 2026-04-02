import Image from 'next/image';

interface HeartIconProps {
  className?: string;
  priority?: boolean;
}

export default function HeartIcon({ className, priority = false }: HeartIconProps) {
  return (
    <Image
      src="/images/icon_heart.png"
      alt=""
      aria-hidden="true"
      width={160}
      height={136}
      className={className}
      priority={priority}
    />
  );
}
