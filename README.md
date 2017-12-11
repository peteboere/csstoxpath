[![Build Status](https://travis-ci.org/peteboere/csstoxpath.svg?branch=master)](https://travis-ci.org/peteboere/csstoxpath)

# CSS to XPath

Converts most CSS 2.1/3 selectors (see exclusions below) to equivalent XPath 1.0 expression.

See `test.js` for examples.


## Custom pseudos

To take advantage of the different capabilities of XPath several custom pseudo selectors have been implemented:

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

Note: Case-insensitive matching supports character sets within [ISO 8859-15](https://en.wikipedia.org/wiki/ISO/IEC_8859-15#Coverage) and Greek.

#### `:any`

Selectors containing multiple options, any one of which will be matched:

E.g: `div :any(ol, ul, dl) > *` equates to `div ol > *, div ul > *, div dl > *`

#### `:comment`

* `:comment` Select comment nodes
* `:comment(n)` Select comment nodes at child position `n`

Note: Can be combined with `:text` to match based on comment text content. E.g. `p > :comment:text("foo")`

#### `:childless`

As `:empty` but ignoring whitespace.


## Unsupported psuedos

The following may be supported at a later date:

* `:nth-last-child`

Part-dynamic pseudos are excluded as they can only be partially supported by attribute matching:

* `:checked`
* `:disabled`
* `:enabled`
* `:required`
* `:lang`

The following cannot be implemented in XPath 1.0:

* `:*-of-type`
* States: `:hover`, `:focus`, `:active`, `:visited`, `:target` etc.
* Elements: `::before`, `::after`, `::first-letter` etc.
