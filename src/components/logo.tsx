import Image from "next/image";
import logo from "../../public/logo-tecnia.png";

/** The company's logo, used in the menu and on the sign-in page. */
export function Logo({ height = 34 }: { height?: number }) {
  return (
    <Image
      src={logo}
      alt="TECNIA"
      priority
      // Keeps the proportions inside flex columns, which would stretch it.
      style={{ height, width: "auto", display: "block", alignSelf: "flex-start" }}
    />
  );
}
