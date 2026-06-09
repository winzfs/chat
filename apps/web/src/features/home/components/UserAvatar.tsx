export function UserAvatar({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  if (imageUrl) {
    return <img className="avatar-image" src={imageUrl} />;
  }

  return <span className="avatar">{name.slice(0, 1)}</span>;
}
