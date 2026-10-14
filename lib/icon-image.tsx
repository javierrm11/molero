import { ImageResponse } from "next/og";

/** Icono de la app (una «M» blanca sobre verde) generado como PNG. */
export function appIcon(size: number, rounded = false) {
  const stroke = Math.round(size * 0.09);
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#136F55",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 64 64">
          <path
            d="M10 50V14l22 21 22-21v36"
            fill="none"
            stroke="#ffffff"
            strokeWidth={(stroke / size) * 64 * 1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
