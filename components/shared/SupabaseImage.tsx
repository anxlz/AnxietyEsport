import Image, { type ImageProps } from 'next/image';
import type { ReactElement } from 'react';

type SupabaseImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string | null;
  alt: string;
  fallbackClassName?: string;
};

export function SupabaseImage({
  src,
  alt,
  fallbackClassName,
  className,
  ...imageProps
}: SupabaseImageProps): ReactElement {
  if (!src) {
    return (
      <div
        className={fallbackClassName ?? 'flex h-full w-full items-center justify-center bg-[#1A1A1F]'}
        role="img"
        aria-label={alt}
      />
    );
  }

  return <Image src={src} alt={alt} className={className} {...imageProps} />;
}
