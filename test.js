/*eslint no-console: 0*/

const cssToXpath = require('./index');
const {expect} = require('chai');

const samples = [
    'Simple',
    ['a', `//a`],
    ['*', `//*`],
    ['#a', `//*[@id = 'a']`],
    ['.a',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]`,
    ],
    ['.a.b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ') and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`,
    ],

    'Child axis',
    ['#a > .b:last-child',
     `//*[@id = 'a']/*[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ') and (position() = last())]`,
    ],

    'Decendant axis',
    ['a .b', `//a//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`],
    ['a .b c', `//a//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]//c`],
    ['a b.c d', `//a//b[@class and contains(concat(' ', normalize-space(@class), ' '), ' c ')]//d`],

    'Direct sibling axis',
    ['.a + b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::*[(translate(name(), 'b', 'B') = 'B') and (position() = 1)]`,
    ],
    ['.a + .b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::*[(position() = 1) and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`,
    ],
    ['.a + b.b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::*[(translate(name(), 'b', 'B') = 'B') and (position() = 1) and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`,
    ],

    'Indirect sibling axis',
    ['.a ~ b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::b`,
    ],
    ['.a ~ .b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::*[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`,
    ],
    ['.a ~ b.b',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ')]/following-sibling::b[@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')]`,
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
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ') and (position() = 1)]`,
    ],

    ':last-child',
    [':last-child', `//*[position() = last()]`],
    ['.a:last-child',
     `//*[@class and contains(concat(' ', normalize-space(@class), ' '), ' a ') and (position() = last())]`,
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
     `//*[not((translate(name(), 'a', 'A') = 'A') and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ') and @c and (position() = 1))]`],
    [':not(:last-child)', `//*[not(position() = last())]`],
    [':not(:nth-child(1n+2))', `//*[not(position() - 2 >= 0)]`],
    ['a :not(.b)', `//a//*[not(@class and contains(concat(' ', normalize-space(@class), ' '), ' b '))]`],
    ['a b:not([c])', `//a//b[not(@c)]`],

    ':text',
    [':text("CafÉ fØöBÄR")',
     `//*[translate(normalize-space(), 'CAFÉØÖBÄR', 'caféøöbär') = "café føöbär"]`],
    [':text("Μεγάλο λιπαρό ελληνικό γάμο")',
     `//*[translate(normalize-space(), 'ΜΕΓΆΛΟΙΠΑΡΌΗΝΚ', 'μεγάλοιπαρόηνκ') = "μεγάλο λιπαρό ελληνικό γάμο"]`],
    [':text("עברית")', `//*[normalize-space() = "עברית"]`],

    ':text-case (case sensitive)',
    [':text-case("foo  BAR ")', `//*[normalize-space() = "foo BAR"]`],

    ':text-contains',
    [':text-contains("foo  bar ")',
     `//*[contains(translate(normalize-space(), 'FOBAR', 'fobar'), "foo bar")]`],

    ':text-contains-case (case sensitive)',
    [':text-contains-case("foo  BAR ")', `//*[contains(normalize-space(), "foo BAR")]`],

    ':text-start',
    [':text-start("foo  bar")',
     `//*[starts-with(translate(normalize-space(), 'FOBAR', 'fobar'), "foo bar")]`],

    ':text-start-case (case sensitive)',
    [':text-start-case("foo  bar")',
     `//*[starts-with(normalize-space(), "foo bar")]`],

    ':text-end',
    [':text-end("foo  bar")',
     `//*[substring(translate(normalize-space(), 'FOBAR', 'fobar'), string-length(translate(normalize-space(), 'FOBAR', 'fobar'))-6) = "foo bar"]`],

    ':text-end-case (case sensitive)',
    [':text-end-case("foo  bar")',
     `//*[substring(normalize-space(), string-length(normalize-space())-6) = "foo bar"]`],

    ':any',
    [':any(a, b)', `//*[(translate(name(), 'a', 'A') = 'A') or (translate(name(), 'b', 'B') = 'B')]`],
    ['a :any(first-child[id], c) d',
     `//a//*[((translate(name(), 'firstchld', 'FIRSTCHLD') = 'FIRST-CHILD') and @id) or (translate(name(), 'c', 'C') = 'C')]//d`],
    ['a > :any(b.b:not([c]), d.d) > e',
     `//a/*[((translate(name(), 'b', 'B') = 'B') and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ') and not(@c)) or ((translate(name(), 'd', 'D') = 'D') and @class and contains(concat(' ', normalize-space(@class), ' '), ' d '))]/e`],

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
     `//a/comment()[1][translate(normalize-space(), 'FO', 'fo') = "foo"]`],
    ['a:comment(1):text-case("Foo")', `//a/comment()[1][normalize-space() = "Foo"]`],
    ['a:comment:text-contains("Foo")',
     `//a/comment()[contains(translate(normalize-space(), 'FO', 'fo'), "foo")]`],
    ['a:comment:text-contains-case("Foo")', `//a/comment()[contains(normalize-space(), "Foo")]`],
];

const groups = {};
let activeGroup;
for (const item of samples) {
    if (typeof item === 'string') {
        activeGroup = item;
        groups[activeGroup] = [];
        continue;
    }
    groups[activeGroup].push(item);
}

for (const name in groups) {
    describe(name, function () {
        for (const [css, xpath] of groups[name]) {
            it(`should convert '${css}'`, function () {
                const converted = cssToXpath(css);
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
        ['a', `translate(name(), 'a', 'A') = 'A'`],
        ['.b', `@class and contains(concat(' ', normalize-space(@class), ' '), ' b ')`],
        ['a.b', `(translate(name(), 'a', 'A') = 'A') and @class and contains(concat(' ', normalize-space(@class), ' '), ' b ')`],
        ['a, b', `(translate(name(), 'a', 'A') = 'A') or (translate(name(), 'b', 'B') = 'B')`],
        [':text("foo")', `translate(normalize-space(), 'FO', 'fo') = "foo"`],
    ];
    for (const [css, xpath] of samples) {
        it(`should convert sub-expression '${css}'`, function () {
            const converted = cssToXpath.subExpression(css);
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
    const unsupported = [
        ':nth-last-child(1)',
        ':nth-of-type',
        ':nth-last-of-type',
        ':last-of-type',
        ':only-of-type',
        ':checked',
        ':disabled',
        ':enabled',
        ':required',
        'a:lang(en)',
    ];
    for (const css of unsupported) {
        it(`should error for unsupported selector '${css}'`, function () {
            expect(() => cssToXpath(css)).to.throw(Error);
        });
    }
});

describe('Author pseudo preprocessing', function () {
    const pseudos = {
        foo: 'foo',
        first: ':first-child:not(:last-child)',
        nth: data => `:nth-child(${data})`,
        radio: `input[type="radio"]`,
        child(data) {
            if (data) {
                const args = data
                    .split(/\s*,\s*/g)
                    .filter(i => i)
                    .map(i => `:nth-child(${i})`);
                return (args.length > 1) ? `:any(${args.join(', ')})` : args[0];
            }
            return `:nth-child(n)`;
        },
    };

    const samples = [
        [':first', [
            `:first-child:not(:last-child)`,
            `//*[(position() = 1) and (not(position() = last()))]`,
        ]],
        [':first[b]', [
            `:first-child:not(:last-child)[b]`,
            `//*[(position() = 1) and (not(position() = last())) and @b]`,
        ]],
        ['a :first c', [
            `a :first-child:not(:last-child) c`,
            `//a//*[(position() = 1) and (not(position() = last()))]//c`,
        ]],
        // Should be ignored.
        ['a :first-child c', [
            `a :first-child c`,
            `//a//*[position() = 1]//c`,
        ]],
        [':child', [
            `:nth-child(n)`,
            `//*[position() >= 0]`,
        ]],
        [':child(1)', [
            `:nth-child(1)`,
            `//*[position() = 1]`,
        ]],
        ['a:child(1, 2, 3):not(.c)', [
            `a:any(:nth-child(1), :nth-child(2), :nth-child(3)):not(.c)`,
            `//a[((position() = 1) or (position() = 2) or (position() = 3)) and (not(@class and contains(concat(' ', normalize-space(@class), ' '), ' c ')))]`,
        ]],
        [`:radio:nth(2)`, [
            `input[type="radio"]:nth-child(2)`,
            `//input[(@type = 'radio') and (position() = 2)]`,
        ]],
        [':foo("(:foo)")', [
            `foo`,
            `//foo`,
        ]],
    ];

    for (const [css, [expectedPostProcess, expectedXPath]] of samples) {
        it(`should preprocess CSS with custom pseudos '${css}' and convert to correct XPath`, function () {
            const actualPostProcess = cssToXpath.applyCustomPsuedos(css, pseudos);
            if (expectedPostProcess) {
                expect(actualPostProcess).to.equal(expectedPostProcess);
                expect(cssToXpath(actualPostProcess)).to.equal(expectedXPath);
                expect(cssToXpath(css, {pseudos})).to.equal(expectedXPath);
            }
            else {
                console.log(`Skip '${css}':\n  ${actualPostProcess}\n  ${cssToXpath(actualPostProcess)}`);
                this.skip();
            }
        });
    }
});
