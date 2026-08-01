import React, { useState } from 'react';

export const DEFAULT_AVATAR_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User Avatar',
  className = 'w-10 h-10 rounded-full object-cover border border-slate-200'
}) => {
  const [imgError, setImgError] = useState(false);

  const finalSrc = (!src || imgError) ? DEFAULT_AVATAR_SVG : src;

  return (
    <img
      src={finalSrc}
      alt={name}
      className={className}
      onError={() => setImgError(true)}
      referrerPolicy="no-referrer"
    />
  );
};
