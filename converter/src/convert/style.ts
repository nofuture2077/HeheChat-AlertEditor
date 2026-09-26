import { SEAlertSettings, SETextCss, SEWidget } from './seTypes';

// Maps StreamElements alert box geometry and text styling to the HeheChat
// position/layout classes (see VisualAlertPlayer.module.css in HeheChat).

export type WidgetBox = {
    vertical: 'top' | 'middle' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
    imageSize: string;
};

const IMAGE_SIZES: [string, number][] = [['image-xs', 10], ['image-sm', 20], ['image-md', 30], ['image-lg', 50], ['image-xl', 100]];
// Rendered font sizes in px, xs is skipped so converted alerts stay readable
const HEADLINE_SIZES: [string, number][] = [['headline-sm', 24], ['headline-md', 32], ['headline-lg', 40], ['headline-xl', 48]];
const TEXT_SIZES: [string, number][] = [['text-sm', 16], ['text-md', 20], ['text-lg', 24], ['text-xl', 28]];

const HIGHLIGHT_COLORS: [string, [number, number, number]][] = [
    ['yellow', [255, 241, 51]],
    ['green', [51, 255, 65]],
    ['red', [255, 51, 51]],
    ['blue', [58, 51, 255]],
    ['orange', [255, 173, 51]],
    ['pink', [255, 51, 153]],
    ['teal', [51, 255, 197]],
    ['violett', [136, 51, 255]]
];
const DEFAULT_HIGHLIGHT = 'yellow';

const FONTS = ['bangers', 'molle', 'fjallaone', 'ericaone', 'daysone', 'pressstart2p', 'ultra'];
const EFFECTS = ['pulse', 'bounce', 'wave', 'shake'];

function px(value: number | string | undefined | null): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = parseFloat(String(value));
    return Number.isFinite(n) ? n : undefined;
}

function nearest(value: number, steps: [string, number][]): string {
    return steps.reduce((best, step) => Math.abs(step[1] - value) < Math.abs(best[1] - value) ? step : best)[0];
}

function third<T>(center: number, size: number, labels: [T, T, T]): T {
    const ratio = center / size;
    return ratio < 1 / 3 ? labels[0] : ratio > 2 / 3 ? labels[2] : labels[1];
}

function parseColor(color?: string): [number, number, number] | undefined {
    if (!color) return undefined;
    const value = color.trim().toLowerCase();
    const rgb = value.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
    if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (!hex) return undefined;
    const digits = hex[1].length === 3 ? hex[1].split('').map(d => d + d).join('') : hex[1];
    return [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16)) as [number, number, number];
}

function fontName(family?: string): string {
    const name = (family || '').split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return FONTS.includes(name) ? name : 'default';
}

export function widgetBox(widget: SEWidget, overlay?: { width?: number; height?: number }): WidgetBox {
    const overlayWidth = overlay?.width || 1920;
    const overlayHeight = overlay?.height || 1080;
    const width = px(widget.css?.width);
    const height = px(widget.css?.height);
    if (!width || !height) {
        return { vertical: 'middle', horizontal: 'center', imageSize: 'image-md' };
    }
    const top = px(widget.css?.top) ?? 0;
    const left = px(widget.css?.left) ?? 0;
    return {
        vertical: third(top + height / 2, overlayHeight, ['top', 'middle', 'bottom']),
        horizontal: third(left + width / 2, overlayWidth, ['left', 'center', 'right']),
        imageSize: nearest(width / overlayWidth * 100, IMAGE_SIZES)
    };
}

// Variations without own text styling inherit the styling of their event
export function textCss(settings: SEAlertSettings, parent?: SEAlertSettings): SETextCss {
    const base = parent?.text?.css || {};
    const own = settings.text?.css || {};
    return {
        ...base,
        ...own,
        highlights: { ...base.highlights, ...own.highlights },
        message: { ...base.message, ...own.message }
    };
}

export function alertPosition(css: SETextCss, box: WidgetBox): string {
    const align = ['left', 'center', 'right'].includes(css['text-align'] || '') ? css['text-align'] : box.horizontal;
    const headlineSize = px(css['font-size']);
    const textSize = px(css.message?.['font-size']);
    return [
        box.vertical,
        box.horizontal,
        `align-${align}`,
        box.imageSize,
        headlineSize ? nearest(headlineSize, HEADLINE_SIZES) : 'headline-md',
        textSize ? nearest(textSize, TEXT_SIZES) : 'text-sm'
    ].join(' ');
}

export function alertLayout(css: SETextCss, animation?: string): string {
    const highlight = parseColor(css.highlights?.color);
    const color = highlight
        ? HIGHLIGHT_COLORS.reduce((best, c) => distance(c[1], highlight) < distance(best[1], highlight) ? c : best)[0]
        : DEFAULT_HIGHLIGHT;
    const textColor = parseColor(css.color);
    const dark = textColor && (0.299 * textColor[0] + 0.587 * textColor[1] + 0.114 * textColor[2]) / 255 < 0.35;
    return [
        `font-headline-${fontName(css['font-family'])}`,
        `font-text-${fontName(css.message?.['font-family'])}`,
        `effect-${EFFECTS.includes(animation || '') ? animation : 'pulse'}`,
        color,
        ...(dark ? ['text-dark'] : [])
    ].join(' ');
}

function distance(a: [number, number, number], b: [number, number, number]): number {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
