// client/src/components/common/Avatar/UserAvatar.jsx
import React from "react";

export const UserAvatar = ({
  user,
  size = 24,
  radius = "5px",
  bordered = true,
  fallbackColor = "var(--text-main)",
}) => {
  const username = user?.username || "?";
  const initial = username.charAt(0).toUpperCase();
  const url = user?.avatar;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: radius,
        backgroundColor: "var(--bg-subpanel)",
        border: bordered ? "1px solid var(--border-color)" : "none",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: fallbackColor,
        fontSize: `${Math.max(8, size * 0.4)}px`,
        fontWeight: 700,
        userSelect: "none",
      }}
    >
      {url ? (
        <img
          src={url}
          alt={username}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentNode.textContent = initial;
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
};

export default UserAvatar;