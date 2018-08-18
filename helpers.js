const parser = require('css-what');

const self = module.exports = {};

self.tokenStream = (css, pseudos) => parser(self.applyCustomPsuedos(css, pseudos));

self.decorateToken = token => {
    const {type, name} = token;
    const titleCase = s => s.replace(/^\w/, m => m.toUpperCase());
    token[`is${titleCase(type)}`] = true;
    if (name) {
        token[`is${titleCase(type)}${name.split(/-/g).map(titleCase).join('')}`] = true;
    }
    token.isSiblingAxis = /^(sibling|adjacent)$/.test(type);
    token.isNonSiblingAxis = /^(descendant|child)$/.test(type);
    token.isAxis = token.isSiblingAxis || token.isNonSiblingAxis;
    token.isTagOrUniversal = /^(tag|universal)$/.test(type);
    return token;
};

self.translateCaseMap = str => {
    const letters = str
        .toLowerCase()
        // ISO/IEC 8859-15 (+ greek) lowercase letters.
        .replace(/[^a-z\u0161\u017E\u0153\u00E0-\u00FF\u03AC-\u03CE]/g, '')
        .split('');
    const az = self.arrayUnique(letters).join('');
    return {az, AZ: az.toUpperCase()};
};

self.arrayUnique = arr => arr.filter((v, i, a) => a.indexOf(v) === i);

self.applyCustomPsuedos = (selector, pseudos) => {
    const names = pseudos ? Object.keys(pseudos) : [];
    if (! names.length) {
        return selector;
    }
    const {string, restore} = literalCapture(selector);
    const patt = new RegExp(`:(${names.join('|')})(?:\\(([^)]+)\\)|(?![\\w-]))`, 'g');
    return restore(string.replace(patt, (_, name, data) => {
        const handler = pseudos[name];
        data = (typeof data === 'string') ? restore(data.trim()) : undefined;
        return (typeof handler === 'function') ? handler(data) : handler;
    }));
};

function literalCapture(string) {
    const literals = [];
    return {
        literals,
        string: string.replace(/(["'])(?:\\\1|.)*?\1/g, m => `__S${literals.push(m)-1}__`),
        restore: str => str.replace(/__S(\d+)__/g, (...m) => literals[m[1]]),
    };
}
