import { initPreview } from './view.ts';
import { parseValueSyntax } from '@tokey/css-value-parser';
// import { valueDefinitions } from '../../packages/css-value-parser/src/value-definitions';

const valueDefinitions = { props: {} as Record<string, { syntax: string }> };

const topBar = document.getElementById('top-bar') as HTMLElement;
const input = document.getElementById('input') as HTMLTextAreaElement;
const output = document.getElementById('output') as HTMLElement;
const select = document.createElement('select');

Object.keys(valueDefinitions.props).forEach((key) => {
    const option = document.createElement('option');
    option.value = valueDefinitions.props[key].syntax;
    option.textContent = key;
    select.appendChild(option);
});

select.selectedIndex = 0;
topBar.appendChild(select);

initPreview(input, output, (...args) => [parseValueSyntax(...args)]);

select.onchange = () => {
    setValue(select.value);
};

function setValue(value: string) {
    input.value = value;
    document.dispatchEvent(new CustomEvent('playground:updateOutput'));
}
setValue(select.value);
