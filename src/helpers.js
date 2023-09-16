import * as CSSwhat from 'css-what';

export function tokenStreams(css, pseudos) {

    const streams = CSSwhat
        .parse(applyCustomPsuedos(css, pseudos));

    const pseudoAliases = {
        first: 'first-child',
        last: 'last-child',
        child: 'nth-child',
        contains: 'text-contains',
    };

    for (const stream of streams) {
        for (const item of stream) {
            if (item.type === 'pseudo' && pseudoAliases[item.name]) {
                item.name = pseudoAliases[item.name];
            }
        }
    }

    return streams;
}

export function decorateToken(token) {

    const {type, name} = token;
    token[`is${titleCase(type)}`] = true;

    if (name) {
        token[`is${titleCase(type)}${name.split(/-/g).map(titleCase).join('')}`] = true;
    }

    token.isSiblingAxis = /^(sibling|adjacent)$/.test(type);
    token.isNonSiblingAxis = /^(descendant|child)$/.test(type);
    token.isAxis = token.isSiblingAxis || token.isNonSiblingAxis;
    token.isTagOrUniversal = /^(tag|universal)$/.test(type);

    return token;
}

export function translateCaseMap(str) {

    const az = str
        .toLowerCase()
        // ISO/IEC 8859-15 (+ greek) lowercase letters.
        .replace(/[^a-z\u0161\u017E\u0153\u00E0-\u00FF\u03AC-\u03CE]/g, '')
        .split('')
        .filter(arrayFilterUnique)
        .join('');

    return {
        az,
        AZ: az.toUpperCase(),
    };
}

export function arrayFilterUnique(v, i, a) {
    return a.indexOf(v) === i;
}

/**
 * @param {string} selector
 * @param {import('./_.d.ts').PseudoDefinitions} pseudos
 */
export function applyCustomPsuedos(selector, pseudos) {

    const keys = pseudos
        ? Object.keys(pseudos)
        : [];

    if (! keys.length) {
        return selector;
    }

    let {string, restore} = literalCapture(selector);

    const names = keys
        .filter(it => ! it.startsWith('/'));

    const dataSubPatt = String.raw`(?:\((?<data>[^)]+)\)|(?![\w-]))`;

    if (names.length) {
        const patt = new RegExp(`:(${names.join('|')})${dataSubPatt}`, 'g');
        string = string
            .replace(patt, (_, name, data) => {

                const handler = pseudos[name];
                const handlerIsFn = typeof handler === 'function';

                data = typeof data === 'string'
                    ? data.trim()
                    : undefined;

                let args = [];
                if (data) {
                    args = (handlerIsFn && handler.length > 1
                        ? data.split(/\s*,\s*/)
                        : [data])
                        .map(restore);
                }

                return handlerIsFn
                    ? handler(...args)
                    : handler;
            });
    }

    const regexes = keys
        .filter(it => it.startsWith('/'))
        .map(it => {
            const source = it.slice(1, it.lastIndexOf('/'));
            if (! /^[a-z]/.test(source)) {
                throw new SyntaxError('Custom pesudo regexes must begin with [a-z] and not use anchors (^$)');
            }

            const handler = pseudos[it];
            if (typeof handler !== 'function') {
                throw new SyntaxError('Custom pesudo regexes must have a function handler');
            }

            return {
                pattern: new RegExp(`:(${source})${dataSubPatt}`, 'g'),
                handler,
            };
        });

    for (const regex of regexes) {
        string = string
            .replace(regex.pattern, (...matches) => {

                // Reduce matches to one object containing named and positional matches.
                const result = {};

                // Seperate data.
                const named = matches.pop();
                const {data} = named;
                delete named.data;

                Object.assign(result, named);

                // Trim irrelevant match data.
                matches.shift(); // Fullmatch.
                matches.pop(); // Full input.
                matches.pop(); // Offset.
                matches.pop(); // Data.

                Object.assign(result, matches);

                return regex.handler(data, result);
            });
    }

    return restore(string);
}

export function quotedString(str) {

    const single = "'";
    const double = '"';
    const strip = /^["']|["']$/g;

    if (
        (str.startsWith(single) && str.endsWith(single))
        || (str.startsWith(double) && str.endsWith(double))
    ) {
        str = str.replace(strip, '');
    }

    return `"${str.replaceAll('"', '&quot;')}"`;
}

function literalCapture(string) {

    const literals = [];

    return {
        literals,
        string: string
            .replace(/(["'])(?:\\\1|.)*?\1/g, m => `__S${literals.push(m)-1}__`),
        restore: str => str
            .replace(/__S(\d+)__/g, (...m) => literals[m[1]]),
    };
}

function titleCase(string) {

    return string.replace(/^\w/, m => m.toUpperCase());
}
