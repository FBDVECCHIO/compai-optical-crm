import type * as React from "react";

type GlassesProps = React.SVGProps<SVGSVGElement> & {
	size?: number | string;
};

export default function Glasses({ size = 16, ...rest }: GlassesProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 32 32"
			xmlns="http://www.w3.org/2000/svg"
			fill="currentColor"
			{...rest}
		>
			<path
				fillRule="evenodd"
				d="M3 13a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v1h1.1a7 7 0 0 1 13.8 0h1.6v-1a1 1 0 0 1 1-1H28a1 1 0 0 1 1 1v1.5a6.5 6.5 0 0 1-6.5 6.5h-1a6.5 6.5 0 0 1-6.5-6.5V16h-2v.5a6.5 6.5 0 0 1-6.5 6.5H5.5A6.5 6.5 0 0 1-1 16.5V13a1 1 0 0 1 1-1h3zm7.5 1a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm11 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"
			/>
		</svg>
	);
}

export { Glasses as GlassesIcon };
