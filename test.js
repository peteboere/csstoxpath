/* global describe it */

const cssToXpath = require('./index');
const {expect} = require('chai');

const samples = [
    'Simple',
    ['a', `//a`],
    ['*', `//*`],
    ['#a', `//*[@id = 'a']`],
    ['.a',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]`
    ],
    ['.a.b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ') and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`
    ],

    'Child axis',
    ['#a > .b:last-child',
     `//*[@id = 'a']/*[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ') and (position() = last())]`
    ],

    'Decendant axis',
    ['a .b', `//a//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`],
    ['a .b c', `//a//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]//c`],
    ['a b.c d', `//a//b[@class and contains(concat(' ', normalize-space(@class), ' '), ' c ')]//d`],

    'Direct sibling axis',
    ['.a + b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::*[(name() = 'b') and (position() = 1)]`
    ],
    ['.a + .b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::*[(position() = 1) and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`
    ],
    ['.a + b.b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::*[(name() = 'b') and (position() = 1) and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`
    ],

    'Indirect sibling axis',
    ['.a ~ b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::b`
    ],
    ['.a ~ .b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::*[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`
    ],
    ['.a ~ b.b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::b[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`
    ],

    'Attributes',
    ['.a[b]', `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ') and @b]`],
    ['a[b="c"]', `//a[@b = 'c']`],
    ['a[b*="c"]', `//a[@b and contains(@b, 'c')]`],
    ['a[b^="c"]', `//a[@b and starts-with(@b, 'c')]`],
    ['a[b$="c"]', `//a[@b and (substring(@b, string-length(@b)-0) = 'c')]`],
    ['a[b|="c"]', `//a[@b and ((@b = 'c' or starts-with(@b, 'c-'))]`],
    ['a[b!="c"]', `//a[not(@b) or @b != 'c']`],

    ':first-child',
    [':first-child', `//*[position() = 1]`],
    ['.a:first-child',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ') and (position() = 1)]`
    ],

    ':last-child',
    [':last-child', `//*[position() = last()]`],
    ['.a:last-child',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ') and (position() = last())]`
    ],

    ':nth-child',
    [':nth-child(1n)', `//*[position() >= 0]`],
    [':nth-child(1n+2)', `//*[position() - 2 >= 0]`],
    [':nth-child(2n)', `//*[position() >= 0 and (position()) mod 2 = 0]`],
    [':nth-child(even)', `//*[position() >= 0 and (position()) mod 2 = 0]`],
    [':nth-child(2n+1)', `//*[position() - 1 >= 0 and (position() - 1) mod 2 = 0]`],
    [':nth-child(odd)', `//*[position() - 1 >= 0 and (position() - 1) mod 2 = 0]`],
    [':nth-child(1n+5)', `//*[position() - 5 >= 0]`],
    [':nth-child(3n+5)', `//*[position() - 5 >= 0 and (position() - 5) mod 3 = 0]`],
    [':nth-child(-n+3)', `//*[position() - 3 <= 0]`],
    [':nth-child(n)', `//*[position() >= 0]`],
    [':nth-child(0)', `//*[position() = 0]`],
    [':nth-child(4)', `//*[position() = 4]`],
    [':nth-child(-2n+3)', `//*[position() - 3 <= 0 and (position() - 3) mod -2 = 0]`],

    ':root',
    [':root', `/*`],
    [':root.a', `/*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]`],
    [':root > .a',
     `/*/*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]`],
    [':root .a',
     `/*//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]`],

    ':only-child',
    [':only-child', `//*[last() = 1]`],

    ':empty',
    [':empty', `//*[not(*) and not(string-length())]`],
    ['a:empty', `//a[not(*) and not(string-length())]`],

    ':childless (non-standard, as :empty but ignoring whitespace)',
    [':childless', `//*[not(*) and not(string-length(normalize-space()))]`],
    ['a:childless', `//a[not(*) and not(string-length(normalize-space()))]`],

    ':not',
    [':not(a.b[c]:first-child)',
     `//*[not((name() = 'a') and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ') and @c and (position() = 1))]`],
    [':not(:last-child)', `//*[not(position() = last())]`],
    [':not(:nth-child(1n+2))', `//*[not(position() - 2 >= 0)]`],
    ['a :not(.b)', `//a//*[not(@class and contains(concat(' ', normalize-space(@class), ' '), ' b '))]`],
    ['a b:not([c])', `//a//b[not(@c)]`],

    ':text',
    [':text(" Foo Bar ")',
     `//*[translate(normalize-space(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = "foo bar"]`],

    ':text-case (case sensitive)',
    [':text-case("foo  BAR ")', `//*[normalize-space() = "foo BAR"]`],

    ':text-contains',
    [':text-contains("foo  bar ")',
     `//*[contains(translate(normalize-space(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "foo bar")]`],

    ':text-contains-case (case sensitive)',
    [':text-contains-case("foo  BAR ")', `//*[contains(normalize-space(), "foo BAR")]`],

    ':text-start',
    [':text-start("foo  bar")',
     `//*[starts-with(translate(normalize-space(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "foo bar")]`],

    ':text-start-case (case sensitive)',
    [':text-start-case("foo  bar")',
     `//*[starts-with(normalize-space(), "foo bar")]`],

    ':text-end',
    [':text-end("foo  bar")',
     `//*[substring(translate(normalize-space(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), string-length(translate(normalize-space(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))-6) = "foo bar"]`],

    ':text-end-case (case sensitive)',
    [':text-end-case("foo  bar")',
     `//*[substring(normalize-space(), string-length(normalize-space())-6) = "foo bar"]`],

    'Unions',
    ['a, b', `(//a|//b)`],
    [':first-child, .foo',
     `(//*[position() = 1]|//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' foo ')])`],

    'Comments',
    [':comment', `//comment()`],
    ['a :comment', `//a//comment()`],
    ['a > :comment', `//a/comment()`],
    ['a:comment', `//a/comment()`],
    ['a:comment(1)', `//a/comment()[1]`],
    ['a:comment(1):text("Foo")',
     `//a/comment()[1][translate(normalize-space(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = "foo"]`],
    ['a:comment(1):text-case("Foo")', `//a/comment()[1][normalize-space() = "Foo"]`],
    ['a:comment:text-contains("Foo")',
     `//a/comment()[contains(translate(normalize-space(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "foo")]`],
    ['a:comment:text-contains-case("Foo")', `//a/comment()[contains(normalize-space(), "Foo")]`]
];

let groups = {};
let activeGroup;
for (let item of samples) {
    if (typeof item === 'string') {
        activeGroup = item;
        groups[activeGroup] = [];
        continue;
    }
    groups[activeGroup].push(item);
}

for (let name in groups) {
    describe(name, function () {
        for (let [css, xpath] of groups[name]) {
            it(`should convert '${css}'`, function () {
                let converted = cssToXpath(css);
                if (xpath) {
                    expect(converted).to.equal(xpath);
                }
                else {
                    console.log(`Skip: ${css} => ${converted}`);
                    this.skip();
                }
            });
        }
    });
}

describe('Sub expressions', function () {
    const samples = [
        ['a', `name() = 'a'`],
        ['.b', `@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')`],
        ['a.b', `(name() = 'a') and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ')`],
        ['a, b', `(name() = 'a') or (name() = 'b')`],
        [':text("foo")', `translate(normalize-space(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = "foo"`]
    ];
    for (let [css, xpath] of samples) {
        it(`should convert sub-expression '${css}'`, function () {
            let converted = cssToXpath.subExpression(css);
            if (xpath) {
                expect(converted).to.equal(xpath);
            }
            else {
                console.log(`Skip: ${css} => ${converted}`);
                this.skip();
            }
        });
    }
});

describe('Unsupported selectors', function () {
    let unsupported = [
        ':nth-last-child(1)',
        ':nth-of-type',
        ':nth-last-of-type',
        ':last-of-type',
        ':only-of-type',
        ':checked',
        ':disabled',
        ':enabled',
        ':required',
        'a:lang(en)'
    ];
    for (let css of unsupported) {
        it(`should error for unsupported selector '${css}'`, function () {
            expect(() => cssToXpath(css)).to.throw(Error);
        });
    }
});
