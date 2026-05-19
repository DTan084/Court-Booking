import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  markOnly?: boolean;
  priority?: boolean;
};

export function BrandLogo({ className, markOnly = false, priority = false }: BrandLogoProps) {
  return (
    <Link href="/" className={cn('inline-flex items-center', className)} aria-label="Tana">
      <Image
        src={markOnly ? '/logo-mark.png' : '/logo.png'}
        alt="Tana"
        width={markOnly ? 36 : 168}
        height={markOnly ? 36 : 38}
        priority={priority}
        className={markOnly ? 'h-9 w-9' : 'h-8 w-[168px]'}
      />
    </Link>
  );
}
