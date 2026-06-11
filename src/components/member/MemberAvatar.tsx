import { useEffect, useState } from "react";
import clsx from "clsx";
import { PiUserDuotone } from "react-icons/pi";
import { api } from "@/services/api";
import type { AuthUser } from "@/lib/workspaces";

type MemberAvatarProps = {
  user?: AuthUser | null;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
};

export function MemberAvatar({
  user,
  name,
  className,
  imageClassName,
  iconClassName,
}: MemberAvatarProps) {
  const [src, setSrc] = useState<string | null>(null);
  const version = user?.memberProfileImageUpdatedAt ?? null;

  useEffect(() => {
    if (!user?.memberId || !version) {
      setSrc(null);
      return undefined;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    api
      .get<Blob>("/member-portal/profile/avatar", {
        responseType: "blob",
        skipAuthRedirect: true,
        params: { v: version },
      })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user?.memberId, version]);

  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary-600 bg-white text-primary-700 shadow-sm",
        className,
      )}
      aria-label={name || user?.name || "Member"}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className={clsx("h-full w-full object-cover", imageClassName)}
        />
      ) : (
        <PiUserDuotone
          className={clsx("h-1/2 w-1/2 text-current", iconClassName)}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
