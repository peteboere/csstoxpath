const parser = require('css-what');

const self = module.exports = {};

self.tokenStream = (css, pseudos) => parser(self.applyCustomPsuedos(css, pseudos));

self.decorateToken = token => {
    let {type, name} = token;
    let titleCase = s => s.replace(/^\w/, m => m.toUpperCase());
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
    if (! pseudos) {
        return selector;
    }
    let {string: css, restore} = literalCapture(selector);
    for (let name in pseudos) {
        css = css.replace(new RegExp(`:${name}(?:\\(([^)]+)\\)|(?![\\w-]))`, 'g'), (...m) => {
            let [, data] = m;
            let handler = pseudos[name];
            data = (typeof data === 'string') ? restore(data.trim()) : undefined;
            return (typeof handler === 'function') ? handler(data) : handler;
        });
    }
    return restore(css);
};

function literalCapture(string) {
    let uid = 0;
    let literals = new Map();
    string = string.replace(/(["'])(?:\\\1|.)*?\1/g, m => {
        let key = `@__${uid++}__@`;
        literals.set(new RegExp(key, 'g'), m);
        return key;
    });
    return {
        string,
        restore(str) {
            for (let [patt, value] of literals) {
                str = str.replace(patt, value);
            }
            return str;
        },
    };
}
