const parser = require('css-what');

module.exports = cssToXPath;

function cssToXPath(css) {
    const streams = parser(css);
    const expressions = [];
    for (let stream of streams) {
        stream.forEach(token => decorateToken(token));
        if (stream[0].isPseudoRoot) {
            stream.shift();
            stream.unshift({type: 'root'});
        }
        else {
            stream.unshift({type: 'descendant'});
        }
        decorateToken(stream[0]);
        expressions.push(xpathExpression(stream));
    }
    return (expressions.length > 1) ? `(${expressions.join('|')})` : expressions[0];
}

cssToXPath.subExpression = css => {
    const streams = parser(css)
        .map(stream => {
            return stream
                .map(token => decorateToken(token))
                .filter(token => token.isPseudo || token.isAttribute || token.isTag);
        });
    return subExpression(streams, {operator: 'or'});
};

function xpathExpression(tokens) {
    let xpath = [];
    let filters = [];
    let commitFilters = () => {
        let flattened = flattenFilters(filters);
        if (flattened) {
            xpath.push(`[${flattened}]`);
        }
        filters = [];
    };

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        let previous = (i > 0) ? tokens[i-1] : {};

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
            let nodeName = token.isTag ? token.name : '*';
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
                let {data} = token;
                if (token.isPseudoNot) {
                    filters.push(`not(${subExpression(data, {operator: 'or'})})`);
                }
                else if (token.isPseudoComment) {
                    if (! previous.isAxis) {
                        commitFilters();
                        xpath.push('/');
                    }
                    xpath.push('comment()' + (data ? `[${data}]` : ''));
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
    let stack = [];
    tokens.forEach(stream => {
        let filters = [];
        stream.forEach(token => {
            filters.push(...resolveAsFilters(decorateToken(token)));
        });
        stack.push(flattenFilters(filters));
    });
    return flattenFilters(stack, options);
}

function resolveAsFilters(token) {
    let elements = [];
    if (token.isTag) {
        elements.push(`name() = '${token.name}'`);
    }
    else if (token.isAttribute) {
        let {name, value, action} = token;
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
        let {name, data} = token;
        switch (name) {
            case 'empty':
                elements.push(`not(*) and not(string-length())`);
                break;
            case 'childless':
                elements.push(`not(*) and not(string-length(normalize-space()))`);
                break;
            case 'first-child':
                elements.push(`position() = 1`);
                break;
            case 'last-child':
                elements.push(`position() = last()`);
                break;
            case 'nth-child': {
                let aliases = {
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
                let nthExpr = /^([-+])?(\d+)?n(?:\+(\d+))?$/.exec(data);
                if (nthExpr) {
                    let [, sign, nth=0, offset=0] = nthExpr;
                    nth = parseInt(nth, 10);
                    let reverseNth = sign === '-';
                    if (reverseNth) {
                        nth *= -1;
                    }
                    let expr = [];
                    let position = 'position()' + (offset ? ` - ${offset}` : '');
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
                    let abc = 'abcdefghijklmnopqrstuvwxyz';
                    text = `translate(normalize-space(), '${abc.toUpperCase()}', '${abc}')`;
                    searchText = searchText.toLowerCase();
                }

                // Respecting authored quote method.
                let quoteMatch = /^(['"])([\s\S]*)\1$/.exec(searchText);
                let quote = quoteMatch ? quoteMatch[1] : '"';
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
    filters = arrayUnique(filters.map(filter => {
        if ((filters.length > 1) && /[=<>]|\b(and|or)\b/i.test(filter)) {
            return `(${filter})`;
        }
        return filter;
    }));
    return filters.length ? filters.join(` ${operator} `) : '';
}

function decorateToken(token) {
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
}

function arrayUnique(arr) {
    return arr.filter((v, i, a) => a.indexOf(v) === i);
}
