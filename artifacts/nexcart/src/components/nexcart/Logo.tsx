import { Link } from "@tanstack/react-router";

interface LogoProps {
  className?: string;
  /** Height of the logo mark+wordmark image, in px. */
  height?: number;
  /**
   * Whether to use the logo image that has "Shop the future" baked in
   * (default, used on the homepage) or the variant without it. Use
   * `showTagline={false}` in compact contexts like sidebars, where the
   * baked-in tagline would render too small to read once the image
   * itself is shrunk down — pair it with your own separately-sized
   * tagline text placed wherever your layout needs it.
   */
  showTagline?: boolean;
}

export function Logo({ className = "", height = 44, showTagline = true }: LogoProps) {
  return (
    <Link to="/" className={`flex items-center ${className}`} style={{ textDecoration: "none" }}>
      <img
        src={showTagline ? "/logo-cropped.png" : "/logo-no-tagline.png"}
        alt="Nexcart"
        style={{ height, width: "auto", objectFit: "contain", display: "block" }}
      />
    </Link>
  );
}
