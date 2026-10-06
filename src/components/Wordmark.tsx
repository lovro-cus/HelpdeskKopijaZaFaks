import logo from "./logo-helpdesk.png";

/**
 * Napis HELPDESK iz logoFaks.png.
 *
 * Risan je kot maska, ne kot slika: podoba nosi samo obliko, barvo pa vzame iz
 * `currentColor`. Tako je v svetli temi črn in v temni svetel — brez druge
 * datoteke. Ikona zavihka (črka H) je src/app/icon.png.
 */
export function Wordmark({ height = 15 }: { height?: number }) {
  // Razmerje izvirnika 1200 × 91 — dolg, nizek napis.
  const h = Math.round(height * 0.9);
  const width = Math.round(h * (1200 / 91) * 10) / 10;

  return (
    <span
      role="img"
      aria-label="HelpDesk"
      style={{
        display: "block",
        width,
        height: h,
        background: "currentColor",
        WebkitMaskImage: `url(${logo.src})`,
        maskImage: `url(${logo.src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
      }}
    />
  );
}
