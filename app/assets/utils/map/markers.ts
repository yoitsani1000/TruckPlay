import { darkenColor, lightenColor } from "~/assets/utils/shared/colors";

export const generateTruckIcon = (
    // baseColor is accepted but unused now: color customization was removed,
    // and this icon is loaded exactly as provided, not redrawn.
    _baseColor?: string,
): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = "/images/truck-icon.png";
    });
};

export const generateDestinationIcon = (
    baseColor: string,
): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const dark = darkenColor(baseColor, 0.2);
        const lightInner = lightenColor(baseColor, 0.05);

        // Also scale the destination pin so it perfectly matches the crispness of the truck
        const scale = 3;
        const width = 28;
        const height = 36;

        const svgString = `
        <svg width="${width * scale}" height="${height * scale}" viewBox="-4 -4 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.25"/>
                </filter>
            </defs>
            <g filter="url(#pin-shadow)">
                <path d="M16 42 C16 42 32 26 32 16 C32 7.6 24.837 0 16 0 C7.6 0 0 7.6 0 16 C0 26 16 42 16 42 Z" fill="${lightInner}" />
                
                <!-- Middle Darker Ring -->
                <circle cx="16" cy="16" r="11" fill="${dark}" />
                
                <!-- Innermost White Circle -->
                <circle cx="16" cy="16" r="4.5" fill="#fafafa" />
            </g>
        </svg>`;

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    });
};
