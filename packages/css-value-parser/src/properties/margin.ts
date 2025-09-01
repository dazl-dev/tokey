import { defineProperty } from '../define-property.ts';

const subMarginPlacements: Record<
    'top' | 'right' | 'bottom' | 'left',
    [single: number, two: number, three: number, four: number]
> = {
    top: [0, 1, 0, 0],
    left: [0, 0, 1, 3],
    bottom: [0, 1, 2, 2],
    right: [0, 0, 1, 1],
};

export const margin = defineProperty({
    name: `margin`,
    syntax: `<length>{1,4}`,
    formats: {
        all: `<length>`,
        'horizontal-vertical': `<length><length>`,
        'top-horizontal-bottom': `<length><length><length>`,
        'top-right-bottom-left': `<length><length><length><length>`,
    },
    classifications: {
        'margin-top': (_node, { amountOfType, indexOfType }) => {
            return subMarginPlacements.top[amountOfType - 1] === indexOfType;
        },
        'margin-right': (_node, { amountOfType, indexOfType }) => {
            return subMarginPlacements.right[amountOfType - 1] === indexOfType;
        },
        'margin-bottom': (_node, { amountOfType, indexOfType }) => {
            return subMarginPlacements.bottom[amountOfType - 1] === indexOfType;
        },
        'margin-left': (_node, { amountOfType, indexOfType }) => {
            return subMarginPlacements.left[amountOfType - 1] === indexOfType;
        },
    },
});
