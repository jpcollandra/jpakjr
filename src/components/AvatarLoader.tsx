import "./AvatarLoader.scss";

export const AVATAR_IMAGE_SRC = "/assets/jpakjrFig.png";

export default function AvatarLoader({
  label = "Loading…",
  variant = "panel",
}: {
  label?: string;
  variant?: "panel" | "compact" | "inline" | "hero";
}) {
  return (
    <span
      className={`avatar-loader avatar-loader--${variant}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="avatar-loader__portrait" aria-hidden="true">
        <img
          src={AVATAR_IMAGE_SRC}
          alt=""
          width={400}
          height={401}
          className="avatar-loader__image"
          draggable={false}
        />
      </span>
      <span className="avatar-loader__label">{label}</span>
    </span>
  );
}
