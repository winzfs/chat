import { assetUrl } from '../api/apiBase';

export function UserAvatar({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  if (imageUrl) {
    return <img alt={`${name} 프로필`} className="avatar-image" src={assetUrl(imageUrl)} />;
  }

  return <span className="avatar">{name.slice(0, 1)}</span>;
}
