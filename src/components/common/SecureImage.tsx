import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store';
import { useCaptchaStore } from '../../store/useCaptchaStore';
import { getSecureAttachmentUrl } from '../../utils/getSecureAttachmentUrl';

interface SecureImageProps {
  fileId: string;
  postId?: string | null;
  alt?: string;
  className?: string;
  onClick?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  loading?: 'lazy' | 'eager';
}

/**
 * SecureImage component that loads images through the secure proxy
 * Automatically includes authentication and CAPTCHA headers
 */
export const SecureImage: React.FC<SecureImageProps> = ({
  fileId,
  postId,
  alt,
  className,
  onClick,
  onError,
  loading = 'lazy'
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const { user } = useAuthStore();
  const { isVerified } = useCaptchaStore();

  useEffect(() => {
    const loadSecureImage = async () => {
      if (!user) {
        setError(true);
        return;
      }

      // Check CAPTCHA verification
      if (!isVerified) {
        console.warn('CAPTCHA verification required to load secure images');
        setError(true);
        return;
      }

      try {
        // Get secure URL
        const secureUrl = getSecureAttachmentUrl(fileId, postId);

        // Fetch image
        const response = await fetch(secureUrl, {
          headers: {
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load secure image');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setImageUrl(blobUrl);
      } catch (err) {
        console.error('Error loading secure image:', err);
        setError(true);
        if (onError) {
          onError(err as any);
        }
      }
    };

    loadSecureImage();

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [fileId, postId, user, isVerified]);

  if (error || !imageUrl) {
    return (
      <div className={className} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        minHeight: '100px'
      }}>
        <span style={{ color: '#6b7280' }}>Unable to load image</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={(e) => {
        setError(true);
        if (onError) {
          onError(e);
        }
      }}
      loading={loading}
    />
  );
};

