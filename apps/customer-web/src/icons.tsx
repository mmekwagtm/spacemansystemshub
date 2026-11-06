import type { ReactElement, SVGProps } from "react";

/** Inline icons from the Spaceman Deliveries design; no icon font or CDN. */
type IconProps = SVGProps<SVGSVGElement>;

function base(
  props: IconProps,
  children: ReactElement | ReactElement[],
  viewBox = "0 0 24 24",
) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox={viewBox}
      {...props}
    >
      {children}
    </svg>
  );
}

export const BackIcon = (p: IconProps) =>
  base({ strokeWidth: 2.4, ...p }, <path d="M14.5 6l-6 6 6 6" />);
export const BagIcon = (p: IconProps) =>
  base(p, [
    <path key="a" d="M6 7h12l1 14H5L6 7z" />,
    <path key="b" d="M9 10V6a3 3 0 0 1 6 0v4" />,
  ]);
export const SearchIcon = (p: IconProps) =>
  base({ strokeWidth: 2.4, ...p }, [
    <circle key="a" cx="11" cy="11" r="7" />,
    <path key="b" d="M20 20l-4-4" />,
  ]);
export const ChevronIcon = (p: IconProps) =>
  base({ strokeWidth: 1.6, ...p }, <path d="M1 1l4 4.5L1 10" />, "0 0 6 11");
export const TruckIcon = (p: IconProps) =>
  base({ strokeWidth: 1.8, ...p }, [
    <path key="a" d="M2 6h12v10H2zM14 9h4l3 3.5V16h-7z" />,
    <circle key="b" cx="6" cy="17.5" r="1.8" />,
    <circle key="c" cx="17" cy="17.5" r="1.8" />,
  ]);
export const ClockIcon = (p: IconProps) =>
  base({ strokeWidth: 1.8, ...p }, [
    <circle key="a" cx="12" cy="12" r="9" />,
    <path key="b" d="M12 7v5l3 2" />,
  ]);
export const TagIcon = (p: IconProps) =>
  base({ strokeWidth: 1.8, ...p }, [
    <path key="a" d="M3 12V4h8l10 10-8 8z" />,
    <circle key="b" cx="7.5" cy="8.5" r="1.4" />,
  ]);
export const PlusIcon = (p: IconProps) =>
  base({ strokeWidth: 2.2, ...p }, <path d="M6 1v10M1 6h10" />, "0 0 12 12");
export const MinusIcon = (p: IconProps) =>
  base({ strokeWidth: 2.2, ...p }, <path d="M1 6h10" />, "0 0 12 12");
export const CloseIcon = (p: IconProps) =>
  base(
    { strokeWidth: 2.4, ...p },
    <path d="M2 2l8 8M10 2l-8 8" />,
    "0 0 12 12",
  );
export const PhoneIcon = (p: IconProps) =>
  base(
    p,
    <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />,
  );
export const PinIcon = (p: IconProps) =>
  base(p, [
    <path key="a" d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />,
    <circle key="b" cx="12" cy="9" r="2.5" />,
  ]);
export const CheckIcon = (p: IconProps) =>
  base({ strokeWidth: 3, ...p }, <path d="M5 12.5l4.5 4.5L19 7.5" />);
export const UserIcon = (p: IconProps) =>
  base(p, [
    <circle key="a" cx="12" cy="8" r="4" />,
    <path key="b" d="M4 21a8 8 0 0 1 16 0" />,
  ]);
export const MailIcon = (p: IconProps) =>
  base(p, [
    <rect key="a" x="3" y="5" width="18" height="14" rx="2" />,
    <path key="b" d="M3 7l9 6 9-6" />,
  ]);
export const InfoIcon = (p: IconProps) =>
  base(p, [
    <circle key="a" cx="12" cy="12" r="9" />,
    <path key="b" d="M12 11v6M12 7.5v.5" />,
  ]);
export const RouteIcon = (p: IconProps) =>
  base(p, [
    <path key="a" d="M12 2.5l9.5 9.5-9.5 9.5L2.5 12z" />,
    <path key="b" d="M9 14v-2.5h5.5M12.5 9.5l2 2-2 2" />,
  ]);

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.2-.2-.5-.3z" />
    </svg>
  );
}

export function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="18"
      height="18"
    >
      <path
        fill="#4285F4"
        d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.7 14a6.6 6.6 0 0 1 0-4.2V7H2a11 11 0 0 0 0 9.9z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A11 11 0 0 0 2 7l3.7 2.9C6.6 7.4 9.1 5.4 12 5.4z"
      />
    </svg>
  );
}

/** The Spaceman stripe mark. */
export function SpacemanLogo() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 44 44">
      <defs>
        <clipPath id="spaceman-logo-clip">
          <circle cx="22" cy="22" r="20" />
        </clipPath>
      </defs>
      <g
        clipPath="url(#spaceman-logo-clip)"
        stroke="#E8420C"
        strokeWidth="3.4"
        strokeLinecap="round"
      >
        <path d="M2 12l24 24M7 4l30 30M15 1l26 26M24 1l17 17M32 2l9 9" />
      </g>
    </svg>
  );
}
