import { defineProperty } from '../define-property.ts';

export const background = defineProperty({
    name: `background`,
    syntax: `[ <bg-layer> , ]* <final-bg-layer>`,
    subSyntax: {
        '<bg-layer>': `<bg-image> || <bg-position> [ / <bg-size> ]? || <repeat-style> || <attachment> || <box> || <box>`,
        '<final-bg-layer>': `<'background-color'> || <bg-image> || <bg-position> [ / <bg-size> ]? || <repeat-style> || <attachment> || <box> || <box>`,
    },
    subProperties: {
        // ToDo: define and add
    },
    topLevelCommaSeparation: true,
    classifications: {
        'background-image': () => {
            return false;
        },
        'background-position': () => {
            return false;
        },
        'background-size': {
            syntax: `<bg-size>`,
            match: () => true,
        },
        'background-repeat': () => {
            return false;
        },
        'background-origin': () => {
            return false;
        },
        'background-clip': () => {
            return false;
        },
        'background-attachment': () => {
            return false;
        },
        'background-color': {
            inTopLevelIndex: (index, total) => {
                return index === total - 1;
            },
            match: () => {
                return false;
            },
        },
    },
});
