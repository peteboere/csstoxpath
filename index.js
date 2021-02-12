'use strict';
const {tokenStreams, decorateToken, translateCaseMap,
    arrayFilterUnique, applyCustomPsuedos, quotedString} = require('./helpers');

const self = module.exports = function cssToXPath(css, {pseudos}={}) {

    const streams = tokenStreams(css, pseudos);
    const expressions = [];

    for (const stream of streams) {
        stream.forEach(token => decorateToken(token));
        if (stream[0].isPseudoRoot) {
            stream.shift();
            stream.unshift({type: 'root'});
        }
        else {
            stream.unshift({type: 'descendant'});
        }
        decorateToken(stream[0]);

        let tagContext;
        for (const item of stream) {
            if (item.isTag) {
                tagContext = item.name;
            }
            else if (item.isAxis) {
                tagContext = null;
            }
            else if (tagContext) {
                item.tagContext = tagContext;
            }
            if (item.isPseudo && item.name.endsWith('-of-type') && ! item.tagContext) {
                throw new SyntaxError('*-of-type pseudos require a tag context');
            }
        }

        expressions.push(xpathExpression(stream));
    }

    return expressions.length > 1
        ? `(${expressions.join('|')})`
        : expressions[0];
};

self.subExpression = (css, {pseudos}={}) => {
    const streams = tokenStreams(css, pseudos)
        .map(stream => {
            return stream
                .map(token => decorateToken(token))
                .filter(token => token.isPseudo || token.isAttribute || token.isTag);
        });

    return subExpression(streams, {operator: 'or'});
};

Object.assign(self, {
    applyCustomPsuedos,
    quotedString,
});

function xpathExpression(tokens) {

    let xpath = [];
    let filters = [];

    const commitFilters = () => {
        const flattened = flattenFilters(filters);
        if (flattened) {
            xpath.push(`[${flattened}]`);
        }
        filters = [];
    };

    for (let i = 0; i < tokens.length; i++) {

        const token = tokens[i];

        const previous = i > 0
            ? tokens[i-1]
            : {};

        if (previous.isNonSiblingAxis && ! token.isTagOrUniversal && ! token.isPseudoComment) {
            xpath.push('*');
        }

        // Sibling axes.
        if (token.isSiblingAxis) {
            commitFilters();
            continue;
        }
        if (previous.isAdjacent) {
            xpath.push('/following-sibling::*');
            if (token.isTag) {
                filters.push(...resolveAsFilters(token));
            }
            filters.push(`position() = 1`);
            if (token.isTagOrUniversal) {
                continue;
            }
        }
        else if (previous.isSibling) {
            const nodeName = token.isTag ? token.name : '*';
            xpath.push(`/following-sibling::${nodeName}`);
            if (token.isTagOrUniversal) {
                continue;
            }
        }

        switch (token.type) {
            case 'root':
                xpath = ['/*'];
                break;
            case 'descendant':
                commitFilters();
                xpath.push('//');
                break;
            case 'child':
                commitFilters();
                xpath.push('/');
                break;
            case 'universal':
                commitFilters();
                xpath.push('*');
                break;
            case 'tag':
                commitFilters();
                xpath.push(token.name);
                break;
            default: {
                const {data} = token;
                if (token.isPseudoNot) {
                    filters.push(`not(${subExpression(data, {operator: 'or'})})`);
                }
                else if (token.isPseudoAny) {
                    filters.push(self.subExpression(data));
                }
                else if (token.isPseudoComment) {
                    if (! previous.isAxis) {
                        commitFilters();
                        xpath.push('/');
                    }
                    xpath.push('comment()' + (data ? `[${data}]` : ''));
                }
                else if (
                    token.isPseudoNthChild
                    || token.isPseudoFirstChild
                    || token.isPseudoLastChild
                    || token.isPseudoOnlyChild
                ) {
                    const tokenFilters = resolveAsFilters(token);
                    if (token.tagContext) {
                        xpath.splice(-1, 1, '*');
                        tokenFilters.unshift(`name() = '${token.tagContext}'`);
                    }
                    filters.push(...tokenFilters);
                }
                else {
                    filters.push(...resolveAsFilters(token));
                }
                break;
            }
        }
    }

    commitFilters();

    return xpath.join('');
}

function subExpression(tokens, options={}) {
    const stack = [];
    tokens.forEach(stream => {
        const filters = [];
        stream.forEach(token => {
            filters.push(...resolveAsFilters(decorateToken(token)));
        });
        stack.push(flattenFilters(filters));
    });

    return flattenFilters(stack, options);
}

function resolveAsFilters(token) {
    const elements = [];
    let {name, value, action, data} = token;

    if (token.isTag) {
        const {az, AZ} = translateCaseMap(name);
        elements.push(`translate(name(), '${az}', '${AZ}') = '${name.toUpperCase()}'`);
    }
    else if (token.isAttribute) {
        switch (action) {
            case 'exists':
                elements.push(`@${name}`);
                break;
            case 'element':
                elements.push(`@${name}`);
                elements.push(`contains(concat(' ', normalize-space(@${name}), ' '), ' ${value} ')`);
                break;
            case 'any':
                elements.push(`@${name}`);
                elements.push(`contains(@${name}, '${value}')`);
                break;
            case 'start':
                elements.push(`@${name}`);
                elements.push(`starts-with(@${name}, '${value}')`);
                break;
            case 'end':
                elements.push(`@${name}`);
                elements.push(`substring(@${name}, string-length(@${name})-${value.length-1}) = '${value}'`);
                break;
            case 'hyphen':
                elements.push(`@${name}`);
                elements.push(`(@${name} = '${value}' or starts-with(@${name}, '${value}-')`);
                break;
            case 'not':
                elements.push(`not(@${name}) or @${name} != '${value}'`);
                break;
            case 'equals':
                elements.push(`@${name} = '${value}'`);
                break;
            default:
                throw new SyntaxError(`Unsupported attribute selector @${name} (action: ${action}).`);
        }
    }
    else if (token.isPseudo) {
        switch (name) {
            case 'empty':
                elements.push(`not(*) and not(string-length())`);
                break;
            case 'childless':
                elements.push(`not(*) and not(string-length(normalize-space()))`);
                break;
            case 'first-child': // fallthrough
            case 'first-of-type':
                elements.push(`position() = 1`);
                break;
            case 'last-child': // fallthrough
            case 'last-of-type':
                elements.push(`position() = last()`);
                break;
            case 'not':
                elements.push(`not(${subExpression(data, {operator: 'or'})})`);
                break;
            case 'nth-child': // fallthrough
            case 'nth-of-type': {
                const aliases = {
                    odd: '2n+1',
                    even: '2n',
                };
                if (aliases[data]) {
                    data = aliases[data];
                }
                if (/^\d+$/.test(data)) {
                    elements.push(`position() = ${data}`);
                    break;
                }
                const nthExpr = /^([-+])?(\d+)?n(?:\+(\d+))?$/.exec(data);
                if (nthExpr) {
                    let [, sign, nth=0, offset=0] = nthExpr;
                    nth = parseInt(nth, 10);
                    const reverseNth = sign === '-';
                    if (reverseNth) {
                        nth *= -1;
                    }
                    const expr = [];
                    const position = 'position()' + (offset ? ` - ${offset}` : '');
                    expr.push(position);
                    expr.push(reverseNth ? '<=' : '>=');
                    expr.push(0);
                    if (nth < 0 || nth > 1) {
                        expr.push(`and (${position}) mod ${nth} = 0`);
                    }
                    elements.push(expr.join(' '));
                    break;
                }
                throw new SyntaxError(`Unrecognized nth-expression '${data}'.`);
            }
            case 'only-child':
                elements.push(`last() = 1`);
                break;
            case 'text': // fallthrough
            case 'text-case': // fallthrough
            case 'text-contains': // fallthrough
            case 'text-contains-case': // fallthrough
            case 'text-start': // fallthrough
            case 'text-start-case': // fallthrough
            case 'text-end': // fallthrough
            case 'text-end-case': {
                // Normalizing whitespace for all text pseudos.
                let text = 'normalize-space()';
                let searchText = data.trim();

                // Case insensitive matching.
                if (! /case/.test(name)) {
                    const {az, AZ} = translateCaseMap(searchText);
                    text = az ? `translate(normalize-space(), '${AZ}', '${az}')` : `normalize-space()`;
                    searchText = searchText.toLowerCase();
                }

                // Respecting authored quote method.
                const quoteMatch = /^(['"])([\s\S]*)\1$/.exec(searchText);
                const quote = quoteMatch ? quoteMatch[1] : '"';
                if (quoteMatch) {
                    searchText = quoteMatch[2].trim();
                }
                searchText = `${quote}${searchText.replace(/\s+/g, ' ')}${quote}`;

                let textExpr = `${text} = ${searchText}`;
                if (/contains/.test(name)) {
                    textExpr = `contains(${text}, ${searchText})`;
                }
                else if (/^text-start/.test(name)) {
                    textExpr = `starts-with(${text}, ${searchText})`;
                }
                else if (/^text-end/.test(name)) {
                    textExpr = `substring(${text}, string-length(${text})-${searchText.length-3}) = ${searchText}`;
                }

                elements.push(textExpr);
                break;
            }
            default:
                throw new SyntaxError(`Unsupported pseudo selector '${token.name}'.`);
        }
    }
    else {
        throw new SyntaxError(`Unsupported token type '${token.type}'.`);
    }

    return elements;
}

function flattenFilters(filters, {operator='and'}={}) {

    return filters
        .map(filter => {
            if ((filters.length > 1) && /[=<>]|\b(and|or)\b/i.test(filter)) {
                return `(${filter})`;
            }
            return filter;
        })
        .filter(arrayFilterUnique)
        .join(` ${operator} `);
}
