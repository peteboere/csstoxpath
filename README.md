[![Build Status](https://travis-ci.org/peteboere/csstoxpath.svg?branch=master)](https://travis-ci.org/peteboere/csstoxpath)

# CSS to XPath

Converts most CSS 2.1/3 selectors (see exclusions below) to equivalent XPath 1.0 expression.

See `test.js` for examples.


## Extension pseudos

To take advantage of the different capabilities of XPath some additional pseudo selectors have been implemented:

#### `:text`

All text matching pseudo classes normalize whitespace and ignore tags.
E.g. `"  my   <i>string</i> "` is treated as `"my string"`.

* `:text("foo")` Case-insensitive matching of element text
* `:text-case("foo")` Case-sensitive `:text-case`
* `:text-contains("foo")` Case-insensitive substring matching of element text
* `:text-contains-case("foo")` Case-sensitive `:text-contains`
* `:text-start("foo")` Case-insensitive matching of element starting text
* `:text-start-case("foo")` Case-sensitive `:text-start`
* `:text-end("foo")` Case-insensitive matching of element ending text
* `:text-end-case("foo")` Case-sensitive `:text-end`

#### `:any`

Selectors containing multiple options, any one of which will be matched:

E.g: `div :any(ol, ul, dl) > *` equates to `div ol > *, div ul > *, div dl > *`

#### `:comment`

* `:comment` Select comment nodes
* `:comment(n)` Select comment nodes at child position `n`

Note: Can be combined with `:text` to match based on comment text content. E.g. `p > :comment:text("foo")`

#### `:childless`

As `:empty` but ignoring whitespace.


## Aliased pseudos

* `:first` is aliased to `:first-child`
* `:last` is aliased to `:last-child`
* `:child` is aliased to `:nth-child`
* `:contains` is aliased to `:text-contains`


## Author pseudos

Authored pseudos can serve as aliases to help simplify selector chains:

```js
/*
 * If the `pseudos` option is set the CSS expression is
 * preprocessed before generating the XPath expression:
 *
 * :radio
 * => input[type="radio"]
 *
 * :element-1(Hello)
 * => element:child(1):contains("Hello")
 */
const cssToXpath = require('csstoxpath');
const xpathExpr = cssToXpath(':radio, :element-1(Hello)', {
    pseudos: {
        radio: 'input[type="radio"]',
        [/element-(\d+)/]: (data, m) => `element:child(${m[1]}):contains("${data}")`,
    }
});
```

## Limitations

The following pseudos are partially supported as they require a tag context:

* `:nth-of-type`
* `:first-of-type`
* `:last-of-type`

The following pseudos are currently unsupported:

* `:nth-last-child`
* `:nth-last-of-type`

Dynamic pseudos are excluded as they can only be partially supported by attribute matching:

* `:checked`
* `:disabled`
* `:enabled`
* `:required`
* `:lang`

The following cannot be implemented in XPath 1.0:

* States: `:hover`, `:focus`, `:active`, `:visited`, `:target` etc.
* Elements: `::before`, `::after`, `::first-letter` etc.
